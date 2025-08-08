import { Schema } from 'effect'

export class BitvavoSdkError extends Schema.TaggedError<BitvavoSdkError>()(
  'BitvavoSdkError',
  {
    method: Schema.String.pipe(
      Schema.annotations({
        description: 'The function called on the SDK',
        example: 'balance',
      }),
    ),
    message: Schema.String.pipe(
      Schema.annotations({
        description: 'Error message',
        example: 'API Key must be of length 64',
      }),
    ),
  },
) {}
