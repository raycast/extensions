import {Action, ActionPanel, List} from "@raycast/api";
import {showFailureToast} from "@raycast/utils";
import {useCallback, useEffect, useRef, useState} from "react";
import {execa, ExecaChildProcess} from "execa";
import {Document} from "./type";
import {openFileCallback} from "./utils";
import { getPreferenceValues } from "@raycast/api";


interface Preferences {
    folderPath: string;
}


export default function Command() {
    const [isQuerying, setIsQuerying] = useState(false);
    const [results, setResults] = useState<Document[]>([]);
    const [query, setQuery] = useState("");
    const searchProcess = useRef<ExecaChildProcess<string> | null>(null);

    process.env.PATH = "/opt/homebrew/bin";

    const contextUpTo = 5

    const searchFiles = useCallback(async (query: string) => {
        const folderPath = getPreferenceValues<Preferences>()
        let documents: Document[] = [];
        setIsQuerying(true);

        try {
            // console.log(`in searchFiles`);
            const process = execa("rga", [
                query,
                "-i",
                "-w",
                "-C",
                contextUpTo.toString(),
                "--json",
                "-m",
                "10000",
                folderPath.folderPath,
            ]);
            const {stdout, exitCode} = await process;

            if (exitCode === 0) {
                // console.log(`exit code 0`);
                const lines = stdout.split("\n");

                documents = findDocuments(lines, contextUpTo)

            } else {
                console.log(`exit code != 0`);
                showFailureToast("Error when searching");
            }
        } catch (err) {
            console.log(err);
            // Handle any errors that occur during the search process
        }

        setIsQuerying(false);
        return documents;
    }, []);

    useEffect(() => {
        if (searchProcess.current) {
            searchProcess.current.cancel();
            searchProcess.current = null;
        }

        if (query.length > 2) {
            const handleSearch = async () => {
                const documents = await searchFiles(query.trim());
                setResults(documents);
            };
            handleSearch();
        } else {
            setResults([]);
        }
    }, [query, searchFiles]);

    useEffect(() => {
        return () => {
            if (searchProcess.current) {
                searchProcess.current.cancel();
                searchProcess.current = null;
            }
        };
    }, []);

    return (
        <List
            isLoading={isQuerying}
            onSearchTextChange={setQuery}
            searchBarPlaceholder="Search..."
            throttle
            isShowingDetail
        >
            <List.Section title="Results" subtitle={results.length + ""}>
                {results.map((result) => (
                    <List.Item
                        key={result.id}
                        title={result.file.match(/[^/]+$/)?.[0] ?? "Unknown File"}
                        subtitle={`Page ${result.page}`}
                        quickLook={{path: result.file, name: result.file.match(/[^/]+$/)?.[0] ?? "Unknown File"}}
                        actions={
                            <ActionPanel>
                                <Action.Open target={result.file} onOpen={() => openFileCallback(result.page)}
                                             title="Open File"/>
                                <Action.ToggleQuickLook/>
                                <Action.OpenWith
                                    path={result.file}
                                    onOpen={() => openFileCallback(result.page)}
                                    shortcut={{modifiers: ["cmd"], key: "enter"}}
                                />
                                <Action.ShowInFinder path={result.file}
                                                     shortcut={{modifiers: ["cmd", "shift"], key: "enter"}}/>
                            </ActionPanel>
                        }
                        detail={<Detail document={result} query={query}/>}
                    />
                ))}
            </List.Section>
        </List>
    );
}


function Detail({document, query}: { document: Document; query: string }) {
    const highlightedContent = document.content
        .split(new RegExp(`(${query})`, "gi"))
        .map((part) =>
            part.toLowerCase() === query.toLowerCase() ? `**[${part}](https://www.youtube.com/watch?v=dQw4w9WgXcQ)**` : part
        )
        .join("");

    return <List.Item.Detail markdown={highlightedContent}/>;
}

function findDocuments(lines, contextUpTo) {
    let result = [];
    let currentDocument = null;
    let currentContext = 0;
    let documentId = 0;

    const isSentenceEnd = text => /[.?!:]\s*$/.test(text); // Check if the text ends with a sentence terminator

    for (const line of lines) {
        if (line.trim() === "") {
            continue; // Skip empty lines
        }

        const input = JSON.parse(line); // Parse the JSON string

        // console.log(input)

        if (input.type === "summary") {
            break
        }

        if (input.type === "end") {
            if (currentDocument !== null && currentDocument.page !== 1) {
                currentDocument.content = currentDocument.content.trim(); // Trim the final content once
                result.push(currentDocument); // Only add if it does not contain content from the first page
            }
            continue
            // break;
        }

        if (!currentDocument) {
            currentDocument = {
                id: documentId++,
                content: "",
                page: 0,
                file: input.data?.path?.text || ""
            };
        }

        const textToAdd = input.data?.lines?.text.replace(/Page \d+: /, "") || '';
        if (input.type === "context" && currentContext < contextUpTo) {
            if (currentDocument.page !== 0) {
                currentContext++;
            }
            currentDocument.content += textToAdd + (isSentenceEnd(textToAdd) ? "\n" : " "); // Conditional newline or space
            continue;
        }

        if (input.type === "context" && currentContext === contextUpTo) {
            if (currentDocument.page !== 1) {
                currentDocument.content = currentDocument.content.trim(); // Trim the content of the current document
                result.push(currentDocument);
            }
            currentDocument = {
                id: documentId++,
                content: textToAdd + (isSentenceEnd(textToAdd) ? "\n" : " "), // Start new document content with a conditional newline or space
                page: 0,
                file: input.data?.path?.text || ""
            };
            currentContext = 0;
            continue;
        }
        if (input.type === "match" && currentDocument.page == 0) {
            currentDocument.content += textToAdd + (isSentenceEnd(textToAdd) ? "\n" : " "); // Conditional newline or space
            currentDocument.page = input.data?.lines?.text.match(/Page (\d+)/) ? parseInt(input.data?.lines?.text.match(/Page (\d+)/)[1]) : 0;
            continue;
        }
        if (input.type === "match" && currentDocument.page != 0) {
            if (currentDocument.page !== 1) {
                currentDocument.content = currentDocument.content.trim(); // Trim the content of the current document
                result.push(currentDocument);
            }
            currentDocument = {
                id: documentId++,
                content: textToAdd + (isSentenceEnd(textToAdd) ? "\n" : " "), // Start new document content with a conditional newline or space
                page: input.data?.lines?.text.match(/Page (\d+)/) ? parseInt(input.data?.lines?.text.match(/Page (\d+)/)[1]) : 0,
                file: input.data?.path?.text || ""
            };
            currentContext = 0;
        }
    }

    result = removeDuplicateDocuments(result)
    result = mergeDocumentsByPage(result);

    return result.filter(doc => doc.page !== 1); // Final filter to ensure no documents from the first page
}



function mergeDocumentsByPage(documents) {
    const mergedDocuments = [];

    // Helper to create a new document object
    const createDocument = (doc, content) => ({
        id: mergedDocuments.length, // Assign a new ID based on length
        content: content,
        page: doc.page,
        file: doc.file
    });

    // Helper to check if the text ends with a sentence terminator
    const isSentenceEnd = text => /[.?!:]\s*$/.test(text);

    // Group documents by page number
    const docsByPage = documents.reduce((acc, doc) => {
        if (!acc[doc.page]) {
            acc[doc.page] = [];
        }
        acc[doc.page].push(doc);
        return acc;
    }, {});

    // Merge documents page by page
    Object.keys(docsByPage).forEach(page => {
        const pageDocs = docsByPage[page];
        let mergedContent = '';

        // Concatenate documents while checking for sentence end
        pageDocs.forEach((doc, index) => {
            if (index === 0) {
                mergedContent += doc.content;
            } else {
                // Add a formatted break or space depending on sentence end
                const prefix = isSentenceEnd(mergedContent) ? "\n\n -----\n" : " ";
                mergedContent += prefix + doc.content;
            }
        });

        if (pageDocs.length > 0) {
            mergedDocuments.push(createDocument(pageDocs[0], mergedContent));
        }
    });

    return mergedDocuments;
}

function removeDuplicateDocuments(documents) {
    const seen = new Set();
    const uniqueDocuments = documents.filter(doc => {
        if (seen.has(doc.content)) {
            return false;
        }
        seen.add(doc.content);
        return true;
    });
    return uniqueDocuments;
}