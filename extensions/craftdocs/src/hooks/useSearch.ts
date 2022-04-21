import {useEffect, useState} from "react";
import useDB from "./useDB";

export type Block = {
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
        const [query, params] = matchQuery.length > 0
            ? [searchQuery, [matchQuery, limit]]
            : [searchQueryOnEmptyParams, [limit]];

        const blocksOfSpaces = databases.map(({database, spaceID}) => {
                const blocks = database
                    .exec(query, params)
                    .map(res => res.values)
                    .flat()
                    .map(([id, content, entityType, documentID]) => ({
                        id,
                        content,
                        entityType,
                        documentID,
                        spaceID
                    } as Block));

                const documentIDs = [
                    ...new Set(
                        blocks
                            .filter(block => block.entityType !== 'document')
                            .map(block => block.documentID)
                    )
                ];

                const placeholders = new Array(documentIDs.length).fill('?').join(', ');

                const sql = `select documentId, content from BlockSearch where entityType = 'document' and documentId in (${placeholders})`;
                database
                    .exec(sql, documentIDs)
                    .map(res => res.values)
                    .flat()
                    .map(([documentID, content]) => blocks.filter(block => block.documentID === documentID).forEach(block => block.documentName = content as string))

                return blocks;
            }
        );

        setState({resultsLoading: false, results: blocksOfSpaces.flat()});
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