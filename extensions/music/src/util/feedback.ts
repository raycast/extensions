
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { showHUD } from '@raycast/api';
import { pipe } from 'fp-ts/lib/function';

export const hud = (text: string) => <T, E extends Error>(te: TE.TaskEither<E, T>) => pipe(
  te,
  TE.chain(() => TE.tryCatch(
    () => showHUD(text),
    E.toError,
  ))
)
