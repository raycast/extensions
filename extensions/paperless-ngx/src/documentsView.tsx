import {getPreferenceValues, Grid, List} from '@raycast/api';
import {useState} from 'react';
import {
    correspondent,
    document,
    documentTag,
    documentType,
    paperlessFetchResponse
} from './models/paperlessResponse.model';
import {fetchDocuments} from './utils/fetchDocuments';
import {DocListItem} from './components/DocListItem';
import {fetchDocumentTags} from './utils/fetchDocumentTags';
import {fetchDocumentTypes} from './utils/fetchDocumentTypes';
import {fetchCorrespondents} from './utils/fetchCorrespondents';
import {Preferences} from './models/preferences.model';
import {DocGridItem} from './components/DocGridItem';

export default function DocumentsView() {

    const {gridMode}: Preferences = getPreferenceValues();

    const [results, setResults] = useState<paperlessFetchResponse>();
    const [tags, setTags] = useState<documentTag[]>();
    const [types, setTypes] = useState<documentType[]>();
    const [correspondents, setCorrespondents] = useState<correspondent[]>();
    const [loading, setLoading] = useState<boolean>(false);

    const onSearchTextChange = async (text: string) => {
        setLoading(true);
        const documentResponse = await fetchDocuments(text.replace(/\s/g, '+'));
        setResults(documentResponse);
        const documentTags = await fetchDocumentTags();
        setTags(documentTags);
        const documentTypes = await fetchDocumentTypes();
        setTypes(documentTypes);
        const correspondentsResponse = await fetchCorrespondents();
        setCorrespondents(correspondents);
        setLoading(false);
    };

    const getCorrespondent = (doc: document) => {
        if (correspondents) {
            const correspondent = correspondents.find((correspondent) => correspondent.id === doc.correspondent);
            return correspondent?.name;
        } else {
            return '';
        }
    };

    const getDocumentType = (doc: document) => {
        if (types) {
            const type = types.find((type) => type.id === doc.document_type);
            return type?.name;
        } else {
            return '';
        }

    };

    const stringifyTags = (doc: document) => {
        // Returns a string of all tags for a document
        if (tags) {
            const tagNames = doc.tags.map((tag) => {
                const tagName = tags.find((tagResult) => tagResult.id === tag);
                return tagName?.name;
            });

            // Remove undefined tags (it seems that Paperless inbox associated tag is not returned by the API in the /tags path)
            const definedTags = tagNames.filter((tag) => tag);

            return definedTags?.join(', ');
        }
    };


    if (gridMode) {
        return (
            <Grid
                aspectRatio={'2/3'}
                columns={5}
                fit={Grid.Fit.Fill}
                isLoading={loading}
                onSearchTextChange={onSearchTextChange}
                navigationTitle="Search Paperless"
                searchBarPlaceholder={`Search documents, like "Steuer"…`}
                throttle={true}
            >
                {results?.results.length
                    ? results.results.map((document) => {
                        return <DocGridItem key={document.id}
                                            document={document}
                                            type={getDocumentType(document)}
                                            correspondent={getCorrespondent(document)}
                                            tags={stringifyTags(document)}/>;
                    })
                    : null}
            </Grid>
        );
    } else {
        return (
            <List
                isLoading={loading}
                isShowingDetail={true}
                searchBarPlaceholder={`Search documents, like "Steuer"…`}
                onSearchTextChange={onSearchTextChange}
                throttle
            >
                {results?.results.length
                    ? results.results.map((document) => {
                        return <DocListItem
                            key={document.id}
                            document={document}
                            type={getDocumentType(document)}
                            correspondent={getCorrespondent(document)}
                            tags={stringifyTags(document)}/>;
                    })
                    : null}
            </List>
        );
    }
}