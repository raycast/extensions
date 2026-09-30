import { CardDetail } from "./components/Details/CardDetail";
import { useFetch } from "@raycast/utils";
import { ScryfallCard } from "./types";

export default function CommandViewRandomCard() {
    const emptyCard: ScryfallCard = {
        artist: "Loading...",
        id: "Loading...",
        mana_cost: "Loading...",
        prices: {
            usd: "Loading...",
            usd_foil: "Loading...",
        },
        released_at: "Loading...",
        set: "Loading...",
        uri: "Loading...",
        scryfall_uri: "Loading...",
        image_uris: {
            normal: "Loading...",
            large: "Loading...",
            png: "Loading...",
            art_crop: "Loading...",
            border_crop: "Loading...",
            small: "Loading...",
        },
        name: "Loading...",
        rulings_uri: "Loading...",
        set_uri: "Loading...",
        type_line: "Loading...",
        oracle_text: "Loading...",
        set_name: "Loading...",
        collector_number: "Loading...",
        keywords: [],
        cmc: 0,
        power: "",
        toughness: "",
        flavor_text: "",
        colors: [],
        color_identity: [],
        rarity: "common",
    };

    const { isLoading, data } = useFetch<ScryfallCard>("https://api.scryfall.com/cards/random");

    return <CardDetail card={data ? data : emptyCard} isLoading={isLoading} />;
}
