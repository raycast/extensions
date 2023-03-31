interface PlayerDetails {
    rowName: string,
    ranking: number,
    points: number,
    id: number,
    bestRanking?: number | null,
    bestRankingDateTimestamp?: string | null,
    "category": string,
    "country": {
        "alpha2": string,
        "name": string
    },
    "disabled": string | null,
    "displayInverseHomeAwayTeams": string | null,
    "firstName": string | null,
    "gender": string,
    "lastName": string | null,
    "name": string,
    "nameCode": string,
    "national": boolean,
    "position": string | null,
    "shortName": string,
    "slug": string,
    "sport": {
        "id": number,
        "name": string,
        "slug": string
    },
    "team": string | null,
    "teamColors": {
        "primary": string | null,
        "secondary": string | null,
        "text": string | null,
    },
    "type": number,
    "userCount": number,
}

export type { PlayerDetails };
