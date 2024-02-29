import { uid } from 'uid';
import { useEffect, useState } from 'react';
import { showToast, List, Toast } from '@raycast/api';

import { searchCard } from './scryfall';
import { CardItem } from './CardItem';

import { MTGItem } from './typings';

interface State {
  items?: MTGItem[];
  error?: Error;
}

const CardsList = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [state, setState] = useState<State>({
    items: [],
  });

  const fetchCards = async (term: string): Promise<void> => {
    if (term.length < 3) {
      setState({ items: [] });
      return;
    }

    setLoading(true);

    try {
      const cards = await searchCard(term);

      setState({ items: cards });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Could not fetch cards',
      });
      setState({
        error:
          error instanceof Error ? error : new Error('Something went wrong'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state?.error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to fetch Scryfall items.',
        message: state.error.message,
      });
    }
  }, [state.error]);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={text => fetchCards(text)}
      searchBarPlaceholder="Search cards (min 3 characters)"
      isShowingDetail
      throttle
    >
      {state?.items?.length
        ? state.items.map(item => <CardItem key={uid()} item={item} />)
        : null}
    </List>
  );
};

export default CardsList;
