import { Detail } from "@raycast/api";
import { abbreviateNames, displayCollaborations } from "./utils";

const ViewDetails = ({ item } : any ) => {
    return ( <Detail
        navigationTitle={item.metadata.titles[0].title}
        markdown={
            item.metadata.document_type[0] === "book" ? (
                `**Book Description** \n --- \n ${item.metadata.abstracts ? item.metadata.abstracts[0].value : "Not available."}`
            ) : (
                `**Abstract** \n --- \n ${item.metadata.abstracts ? item.metadata.abstracts[0].value : "Not available."}`
            )
        }
        metadata={
            <Detail.Metadata>
                <Detail.Metadata.Label
                    title="Authors"
                    text={
                        item.metadata.authors
                            ? abbreviateNames(item.metadata.authors)
                            : displayCollaborations(item.metadata.collaborations)
                    }
                />
                {item.metadata.arxiv_eprints ?
                    (
                        <Detail.Metadata.Link
                            title="ArXiv"
                            target={`https://arxiv.org/pdf/${item.metadata.arxiv_eprints[0].value}`}
                            text={item.metadata.arxiv_eprints[0].value}
                        />
                    )
                    :
                    (
                        <Detail.Metadata.Label
                            title="Year"
                            text={item.created.slice(0, 4)}
                        />
                    )
                }
                {item.metadata.publication_info &&
                    item.metadata.publication_info[0].journal_title &&
                    item.metadata.dois &&
                    item.metadata.dois[0].value && (
                        <Detail.Metadata.Link
                            title="Journal"
                            target={`https://doi.org/${item.metadata.dois[0].value}`}
                            text={item.metadata.publication_info[0].journal_title}
                        />
                    )}
                {item.metadata.document_type &&
                    (item.metadata.document_type[0] === "book") &&
                    item.metadata.imprints &&
                    item.metadata.imprints[0].publisher &&
                    item.metadata.dois &&
                    item.metadata.dois[0].value && (
                        <Detail.Metadata.Link
                            title="Publisher"
                            target={`https://doi.org/${item.metadata.dois[0].value}`}
                            text={item.metadata.imprints[0].publisher}
                        />
                    )}
                {item.metadata.document_type &&
                    (item.metadata.document_type[0] === "book") &&
                    item.metadata.imprints &&
                    item.metadata.imprints[0].publisher &&
                    !item.metadata.dois && (
                        <Detail.Metadata.Label
                            title="Publisher"
                            text={item.metadata.imprints[0].publisher}
                        />
                    )}
                {item.metadata.number_of_pages && (
                    <Detail.Metadata.Label
                        title="Pages"
                        text={`${item.metadata.number_of_pages}`}
                    />
                )}
                {item.metadata.keywords && (
                    <Detail.Metadata.TagList title="Keywords">
                        {item.metadata.keywords.map((keyword: any, index: number) => (
                            <Detail.Metadata.TagList.Item
                                key={index}
                                text={keyword.value}
                                color="#FFFFFF"
                            />
                        ))}
                    </Detail.Metadata.TagList>
                )}
            </Detail.Metadata>
        }
    />
    );
};

export default ViewDetails;