import { environment, List } from "@raycast/api";
import { readFileSync } from "fs";
import { useEffect, useState } from "react";
import { CopyActionPanel } from "./components/actions";
import { encodeSVG } from "./lib/character-formatting";
import { translatePinyinToBopomofo } from "./lib/translate";

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

    const [queryText, setQueryText] = useState("");
    const [result, setResult] = useState("");

    useEffect(() => {
        setResult(translatePinyinToBopomofo(queryText));
    }, [queryText]);

    return (
        <List
            isLoading={items.length === 0}
            onSearchTextChange={setQueryText}
            searchBarPlaceholder="Type pinyin to translate..."
        >
            {queryText.length === 0 ? (
                <List.EmptyView
                    title="Type pinyin to see the translation result."
                    description="You can also add numeric tones (1-5) for tone marks."
                />
            ) : (
                <>
                    <List.Section title="Translation Result">
                        <List.Item key="result" title={result} actions={<CopyActionPanel name={result} omitText />} />
                    </List.Section>
                </>
            )}
        </List>
    );
}
