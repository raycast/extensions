export enum SearchKind {
    Accounts = 'accounts',
    Hashtags = 'hashtags',
}

export function displayNameFor(kind: SearchKind) {
    switch (kind) {
        case SearchKind.Accounts:
            return 'People'
        case SearchKind.Hashtags:
            return 'Hashtags'
    }
}
