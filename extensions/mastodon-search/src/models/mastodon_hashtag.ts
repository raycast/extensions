export class MastodonHashtag {
    readonly name: string
    readonly url: string

    constructor(hashtag: MastodonHashtag) {
        this.name = hashtag.name
        this.url = hashtag.url
    }
}
