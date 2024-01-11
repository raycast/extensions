# Docsearch

Raycast extension for performing search across groups of selected PDF documents. Currently it uses PDFKit to separate pdf files into their paragraphs. It then uses [Jina AI's small embedding model](https://huggingface.co/jinaai/jina-embeddings-v2-small-en) to encode the documents, and dot product similarity is used to get the most relevant documents defined in the collection.

## Define Collection

Create a collection by naming and selecting a group of PDF files/directories from finder, which can also be removed from the menu. These files will be parsed and encoded using a tokeniser, and the embeddings will be stored in a SQLite database in the support directory. Note that this process can range from seconds to minutes depending on how large the files in the collection are.

You can also edit existing collections, and saving the changes to a collection will trigger a rebuild of the index. Note that collection names have to be unique, and changing the name of a collection will trigger the database with the old name to be deleted.

## Search Collection

When a collection selected, you will be brought to a page where you can enter your search query, which will be used to search the index within the collection's database. Selecting any of the results will open the PDF document and navigate to the page that contains the query at the location that matches.

## Roadmap

- [x] Ability to handle large file sizes without exceeding memory limit.
- [x] Open documents to exact page where match was found.
- [ ] Improve PDF parsing logic.
- [x] Store embeddings into memory for faster retrieval.
- [ ] Hybrid search by using combination of BM25 with semantic re-rankers.

## Getting Started

Run the script commands in `compile-model.sh` to compile `EmbeddingModel.mlpackage` and generate the Swift class for it.
