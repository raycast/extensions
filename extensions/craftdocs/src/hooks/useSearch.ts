import {useEffect, useState} from "react";
import useDB from "./useDB";

type Block = {
    id: string;
    spaceID: string;
    content: string;
    entityType: string;
    documentID: string;
    documentName: string;
};

const limit = 40;

const searchQuery = `
SELECT id, content, entityType, documentId
FROM BlockSearch(?)
ORDER BY rank + customRank
LIMIT ?
`

const searchQueryOnEmptyParams = `
SELECT id, content, entityType, documentId
FROM BlockSearch
ORDER BY customRank
LIMIT ?
`

export default function useSearch(text: string) {
    const [state, setState] = useState({resultsLoading: true, results: [] as Block[]})
    const {databases, databasesLoading} = useDB();

    useEffect(() => {
        if (databasesLoading) return;

        setState(prev => ({...prev, resultsLoading: true}))

        const matchQuery = buildMatchQuery(text);
        const databasesResponse = matchQuery && matchQuery.length > 0
            ? databases.map(db => db.exec(searchQuery, [matchQuery, limit]))
            : databases.map(db => db.exec(searchQueryOnEmptyParams, [limit]));

        const blocks = databasesResponse
            .map(databaseResponse => databaseResponse.map(row => row.values))
            .flat(2)
            .map(([id, content, entityType, documentID]) => ({id, content, entityType, documentID} as Block));

        setState({resultsLoading: false, results: blocks});
    }, [databasesLoading, text]);

    return state;
}

const buildMatchQuery = (str: string): string => {
    if (!str || str.length === 0) {
        return '';
    }

    const terms = str
        .split(/\s+/)
        .map(word => word.trim())
        .map(word => word.replace('"', '\\"'))
        .map(word => `"${word}"`);

    const phrases = [
        terms.join(' '),
        terms.join(' ') + '*'
    ];

    if (terms.length > 1) {
        phrases.push(terms.join('* ') + '*')
    }

    return `{content exactMatchContent} : (${phrases.join(') OR (')})`;
}