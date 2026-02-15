export interface Tweet {
  id: string
  text: string
  createdAt: string
  replyCount: number
  retweetCount: number
  likeCount: number
  conversationId: string
  author: {
    username: string
    name: string
  }
  authorId: string
  media?: TweetMedia[]
}

export interface TweetMedia {
  type: "photo" | "video" | "animated_gif"
  url: string
  width?: number
  height?: number
  previewUrl?: string
}
