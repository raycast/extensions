# PDFSearch

Raycast extension for performing search across groups of selected PDF documents. It uses PDFKit to perform keyword search for all files within the collection, extracts the paragraph the matches are contained in, then reranks the paragraphs based on its semantic similarity with the search query.

![Collections](metadata/pdfsearch-1.png)

## Creating and Editing Collections

Create a collection by naming and selecting a group of PDF files/directories from finder, which can also be removed from the collection. You can also edit existing collections. Note that collection names have to be unique.

![Create/Edit Collection](metadata/pdfsearch-2.png)

## Search Collection

When a collection selected, you will be brought to a page where you can enter your search query, which will be used to search all files within the collection. Selecting any of the results will open the PDF document and navigate to the page that contains the query at the location that matches. You can also preview the document using quick look, or show the file in finder.

![Search Collection](metadata/pdfsearch-3.png)

## Roadmap

- [ ] Improve search speed.
- [ ] Use ContextualEmbeddings to perform similarity search.
