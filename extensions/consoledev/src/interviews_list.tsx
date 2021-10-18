import { List, showToast, ToastStyle } from "@raycast/api";
import { isLeft } from 'fp-ts/lib/Either';
import { useEffect, useState } from "react";
import FeedItem from './components/FeedItem';
import { Feed, Interview } from './responseTypes';
import { getInterviewsFeed } from './util';


interface State {
  feed: Feed<Interview> | null;
  error?: Error
}


export default function InterviewsList() {
  const [state, setState] = useState<State>( {
    feed: null
  } );

  useEffect( () => {
    async function fetchInterviews() {
      const feedEither = await getInterviewsFeed();

      if ( isLeft( feedEither ) ) {
        showToast( ToastStyle.Failure, 'Failed to fetch Interviews.' )
        return
      }

      setState( { feed: feedEither.right } )
    }

    fetchInterviews();
  }, [] );

  return (
    <List
      isLoading={state.feed === null}
      navigationTitle={state.feed?.title}
      searchBarPlaceholder="Filter interviews by name..."
    >
      {state.feed?.items.map( interview => (
        <FeedItem item={interview} key={interview.link} />
      ) )}
    </List>
  );
}
