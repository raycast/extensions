import { Collection, createClient, ErrorResponse, Photos } from "pexels";
import React, { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { CollectionMediasResponse, CollectionsResponse } from "../utils/types";
import { commonPreferences, isEmpty } from "../utils/common-utils";
import Style = Toast.Style;

const pexelsClient = createClient(commonPreferences().apikey);

export const searchPhotos = (searchContent: string, page: number) => {
  const [pexelsPhotos, setPexelsPhotos] = useState<Photos>({ page: 0, next_page: 1, per_page: 15, photos: [] });
  const [oldSearchContent, setOldSearchContent] = useState<string>(searchContent);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (isEmpty(searchContent)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const photosResponse = await pexelsClient.photos.search({
        query: searchContent,
        per_page: 15,
        page: page,
      });
      if (oldSearchContent === searchContent) {
        //load more content
        await updatePexelsPhoto(photosResponse, pexelsPhotos, setPexelsPhotos, page);
      } else {
        //search new content
        if ((photosResponse as ErrorResponse).error) {
          console.error((photosResponse as ErrorResponse).error);
          await showToast(Style.Failure, String((photosResponse as ErrorResponse).error));
        } else {
          setPexelsPhotos(photosResponse as Photos);
        }
        setOldSearchContent(searchContent);
      }
    } catch (e) {
      console.error(String(e));
      await showToast(Style.Failure, String(e));
    }
    setLoading(false);
  }, [searchContent, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { pexelsPhotos: pexelsPhotos, loading: loading };
};

export const getCuratedPhotos = (page: number) => {
  const [pexelsPhotos, setPexelsPhotos] = useState<Photos>({ page: 0, next_page: 1, per_page: 15, photos: [] });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const photosResponse = await pexelsClient.photos.curated({
        per_page: 15,
        page: page,
      });
      await updatePexelsPhoto(photosResponse, pexelsPhotos, setPexelsPhotos, page);
    } catch (e) {
      console.error(String(e));
      await showToast(Style.Failure, String(e));
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { pexelsPhotos: pexelsPhotos, loading: loading };
};

const updatePexelsPhoto = async (
  photosResponse: Photos | ErrorResponse,
  pexelsPhotos: Photos,
  setPexelsPhotos: React.Dispatch<React.SetStateAction<Photos>>,
  page: number
) => {
  if ((photosResponse as ErrorResponse).error) {
    console.error((photosResponse as ErrorResponse).error);
    await showToast(Style.Failure, String((photosResponse as ErrorResponse).error));
  } else {
    const newPhotos = photosResponse as Photos;
    const allPhotos = pexelsPhotos.photos.concat(newPhotos.photos);
    setPexelsPhotos({
      url: newPhotos.url,
      page: newPhotos.page,
      per_page: newPhotos.per_page,
      next_page: page + 1,
      photos: allPhotos,
    });
  }
};

export const getCollections = (collectionTag: string, page: number) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [oldCollectionTag, setOldCollectionTag] = useState<string>(collectionTag);
  const [oldPage, setOldPage] = useState<number>(page);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (collectionTag.length === 0) {
      return;
    }
    if (oldCollectionTag === collectionTag && page === oldPage) {
      return;
    }
    if (oldCollectionTag !== collectionTag) {
      page = 1;
    }
    setOldCollectionTag(collectionTag);
    setOldPage(page);
    setLoading(true);
    try {
      let _featuredCollections;
      switch (collectionTag) {
        case "0": {
          _featuredCollections = (await pexelsClient.collections.all({ page: page })) as
            | CollectionsResponse
            | ErrorResponse;
          break;
        }
        case "1": {
          _featuredCollections = (await pexelsClient.collections.featured({ page: page })) as
            | CollectionsResponse
            | ErrorResponse;
          break;
        }
        default: {
          _featuredCollections = (await pexelsClient.collections.all({ page: page })) as
            | CollectionsResponse
            | ErrorResponse;
          break;
        }
      }
      if ((_featuredCollections as ErrorResponse).error) {
        console.error((_featuredCollections as ErrorResponse).error);
        await showToast(Style.Failure, String((_featuredCollections as ErrorResponse).error));
      } else {
        const newCollectionMedias = _featuredCollections as CollectionsResponse;
        if (page === 1) {
          setCollections(newCollectionMedias.collections);
        } else {
          const allCollectionMedias = collections.concat(newCollectionMedias.collections);
          setCollections(allCollectionMedias);
        }
      }
    } catch (e) {
      console.error(String(e));
      await showToast(Style.Failure, String(e));
    }
    setLoading(false);
  }, [collectionTag, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { collections: collections, loading: loading };
};

export const getCollectionMedias = (id: string, page: number) => {
  const [collectionMedias, setCollectionMedias] = useState<CollectionMediasResponse>({
    page: 0,
    per_page: 15,
    total_results: 0,
    media: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const _featuredCollections = (await pexelsClient.collections.media({
        page: page,
        id: id,
        type: "photos",
      })) as CollectionMediasResponse | ErrorResponse;
      if ((_featuredCollections as ErrorResponse).error) {
        console.error((_featuredCollections as ErrorResponse).error);
        await showToast(Style.Failure, String((_featuredCollections as ErrorResponse).error));
      } else {
        const newCollectionMedias = _featuredCollections as CollectionMediasResponse;
        const allCollectionMedias = collectionMedias.media.concat(newCollectionMedias.media);
        setCollectionMedias({
          page: page,
          per_page: newCollectionMedias.per_page,
          total_results: newCollectionMedias.total_results,
          media: allCollectionMedias,
        });
      }
    } catch (e) {
      console.error(String(e));
      await showToast(Style.Failure, String(e));
    }
    setLoading(false);
  }, [id, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { collectionMedias: collectionMedias, loading: loading };
};
