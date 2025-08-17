import { gql } from "../__generated__";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import fetch from "cross-fetch";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

const uri = preferences["graphql-endpoint"] as string;

export const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({ uri, fetch }),
});

export const getPlayersQuery = gql(/* GraphQL */ `
  query Players {
    players {
      id
      state {
        muted
        paused
      }
      streamData {
        title
        channelId
        contentId
        meetingKey
        sessionKey
      }
      type
      driverData {
        driverNumber
        tla
        firstName
        lastName
        teamName
      }
    }
  }
`);

export const setPlayerPauseStateMutation = gql(/* GraphQL */ `
  mutation PlayerSetPaused($playerSetPausedId: ID!, $paused: Boolean) {
    playerSetPaused(id: $playerSetPausedId, paused: $paused)
  }
`);

export const setPlayerMuteMutation = gql(/* GraphQL */ `
  mutation PlayerSetMute($playerSetMutedId: ID!) {
    playerSetMuted(id: $playerSetMutedId)
  }
`);

export const syncPlayersMutation = gql(/* GraphQL */ `
  mutation PlayerSync($playerSyncId: ID!) {
    playerSync(id: $playerSyncId)
  }
`);
