import {useDebounce} from 'use-debounce';
import Fuse from 'fuse.js';
import {getMemes} from 'api';
import {Meme} from 'types';
import {useEffect, useMemo, useState} from 'react';

type Result = {
  error: string | null;
  results: Fuse.FuseResult<Meme>[] | null;
};

export function useMemeSearch(searchTextInput: string): Result {
  const [searchText] = useDebounce(searchTextInput, 250);
  const [error, setError] = useState<string>();
  const [memes, setMemes] = useState<Fuse<Meme>>();
  const [allMemes, setAllMemes] = useState<Fuse.FuseResult<Meme>[]>();

  useEffect(() => {
    getMemes().then((result) => {
      if (result.success) {
        setAllMemes(
          result.memes.map((item, index) => ({
            item,
            refIndex: index,
            matches: [],
            score: 1,
          })),
        );
        setMemes(new Fuse(result.memes, {keys: ['name']}));
      } else {
        setError(result.message);
      }
    });
  }, []);

  const results = useMemo(() => {
    if (!memes) {
      return null;
    }

    if (searchText.length === 0) {
      return allMemes;
    }

    return memes.search(searchText);
  }, [searchText, memes]);

  return {
    results: results || null,
    error: error || null,
  };
}
