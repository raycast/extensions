import { environment, Grid } from "@raycast/api";
import { readFileSync } from "fs";
import { useEffect, useState } from "react";
import { CopyActionPanel } from "./components/actions";
import { encodeSVG } from "./lib/character-formatting";

const dataset = JSON.parse(readFileSync(`${environment.assetsPath}/bopomofo-dataset.json`, "utf-8")) as Record<
    string,
    string[]
>;
const items = Object.entries(dataset).map(([bopomofo, pinyinList]) => ({
    key: bopomofo,
    pinyinList,
    icons: {
        light: encodeSVG(bopomofo, false),
        dark: encodeSVG(bopomofo, true),
    },
}));

export default function Command() {
    /**
     * The dataset is a mapping of bopomofo to all corresponding pinyin. For example:
     *   "ㄅ" -> ["b"]
     *   "ㄩ" -> ["u", "v", "yu"]
     */

    const [searchText, setSearchText] = useState("");
    const [filteredList, filterList] = useState(items);

    useEffect(() => {
        filterList(
            items.filter(({ pinyinList }) => pinyinList.some((pinyin) => pinyin.includes(searchText.toLowerCase()))),
        );
    }, [searchText]);

    return (
        <Grid
            columns={8}
            inset={Grid.Inset.Small}
            searchBarPlaceholder="Search with pinyin for corresponding bopomofo..."
            filtering={false}
            onSearchTextChange={setSearchText}
        >
            {filteredList.map(({ key, pinyinList, icons }) => (
                <Grid.Item
                    key={key}
                    content={{
                        source: icons,
                        tooltip: key,
                    }}
                    title={""} // empty title to show subtitle only
                    subtitle={pinyinList.join(", ")} // for aesthetic purpose
                    actions={<CopyActionPanel name={key} />}
                />
            ))}
        </Grid>
    );
}
