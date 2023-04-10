import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as R from "fp-ts/Reader";
import { Interview, Beta, Feed, FeedItemInterface, FeedType, Tool } from "./responseTypes";
import axios from "axios";
import { buildFeed } from "./xml";

export const getFeed: RTE.ReaderTaskEither<FeedType, Error, Feed<FeedItemInterface>> = pipe(
  R.ask<FeedType>(),
  R.map((feedType) =>
    pipe(
      TE.tryCatch(() => axios.get<string>(`https://console.dev/${feedType}/rss.xml`), E.toError),
      TE.chain((res) => pipe(TE.tryCatch(() => buildFeed(res.data), E.toError)))
    )
  )
);

export const getToolsFeed: TE.TaskEither<Error, Feed<Tool>> = pipe("tools", getFeed);

export const getBetasFeed: TE.TaskEither<Error, Feed<Beta>> = pipe("betas", getFeed);

export const getInterviewsFeed: TE.TaskEither<Error, Feed<Interview>> = pipe("interviews", getFeed);
