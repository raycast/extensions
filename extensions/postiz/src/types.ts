export enum Identifier {
    bluesky="bluesky",
    x="x",
}
export type Integration = {
    id: string;
    name: string;
    identifier: Identifier;
    picture: string;
    disabled: boolean;
    profile: string;
}

export enum State {
    DRAFT="DRAFT",
    PUBLISHED="PUBLISHED",
}
export type Post = {
    id: string;
    content: string;
    state: State;
    integration: {
        providerIdentifier:Identifier;
        picture: string;
    }
}