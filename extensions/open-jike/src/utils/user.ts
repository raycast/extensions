import type { JikeClient } from 'jike-sdk/index'
import type { ConfigUser } from './config'

export const isSameUser = (left: ConfigUser, right: ConfigUser | undefined) =>
  // left.endpointUrl === right.endpointUrl &&
  left.userId === right?.userId

export const getUserIndex = (
  users: ConfigUser[],
  user: ConfigUser | undefined
) => users.findIndex((u) => isSameUser(u, user))

export const toJSON = async (client: JikeClient): Promise<ConfigUser> => ({
  ...(await client.toJSON()),
  avatarImage: (await client.getSelf().queryProfile()).user.avatarImage
    .thumbnailUrl,
})
