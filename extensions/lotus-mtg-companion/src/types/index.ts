export interface ScryfallCardQuery {
    total_cards: number;
    data: ScryfallCard[];
}

export interface ScryfallCard {
    id: string;
    name: string;
    released_at: string;
    uri: string;
    scryfall_uri: string;
    image_uris: {
        small: string;
        normal: string;
        large: string;
        png: string;
        art_crop: string;
        border_crop: string;
    };
    mana_cost: string;
    produced_mana?: string[];
    cmc: number;
    power?: string;
    toughness?: string;
    type_line: string;
    oracle_text: string;
    flavor_text?: string;
    colors: string[];
    color_identity: string[];
    set: string;
    set_name: string;
    keywords: string[];
    collector_number: string;
    rarity: string;
    artist: string;
    set_uri: string;
    rulings_uri: string;
    prices: {
        usd: string;
        usd_foil: string;
    };
    card_faces?: ScryfallCard[];
}

export interface ScryfallSetQuery {
    has_more: boolean;
    data: ScryfallSet[];
}

export interface ScryfallSet {
    object: string;
    id: string;
    code: string;
    name: string;
    uri: string;
    scryfall_uri: string;
    search_uri: string;
    released_at: string;
    set_type: string;
    card_count: number;
    digital: boolean;
    icon_svg_uri: string;
}

export interface ScryfallSet {
    icon_svg_uri: string;
}

export interface ScryfallRulings {
    hasMore: boolean;
    data: [
        {
            published_at: string;
            comment: string;
        },
    ];
}

export interface Mana {
    color: string;
    symbol: string;
}
