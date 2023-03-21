export const defaultCommands = {
  "Table Of Contents":
    '{"useFileMetadata":false,"acceptedFileExtensions":"","prompt":"Generate a table of contents for each of the following files based on their content. Use the file names as headings. For each item in the table, provide an percent estimation of how far into the document the associated content occurs. Format the response as a markdown list.","name":"Table Of Contents","icon":"bullet-points-16","useSoundClassifications":false}',
  "Extract Named Entities":
    '{"useFileMetadata":false,"name":"Extract Named Entities","icon":"person-lines-16","useSoundClassifications":false,"prompt":"What are the named entities in the following files, and what are their meanings and purpose? Clarify any abbreviations. Format the response as markdown list of sentences with the entity terms in bold. Use the file names as headings.","acceptedFileExtensions":""}',
  "Translate To English":
    '{"icon":"text-16","acceptedFileExtensions":"","prompt":"Translate the following files to English, using the file names as headings. Reword the translations so that they make sense in plain English. If the phrase is well known in either English or the source language, use the most commonly accepted translation.","useSoundClassifications":false,"useFileMetadata":false,"name":"Translate To English"}',
  "Generate Questions":
    '{"acceptedFileExtensions":"","prompt":"Generate questions based on the content of each of the following files, their metadata, filename, type, and other information. Format the response as a markdown list.","useSoundClassifications":true,"name":"Generate Questions","icon":"question-mark-circle-16","useFileMetadata":true}',
  "Extract Emails":
    '{"name":"Extract Emails","acceptedFileExtensions":"","useFileMetadata":false,"prompt":"Extract emails from the following files and list them as markdown links:","icon":"envelope-16,"useSoundClassifications":false}',
  "Find Errors":
    '{"icon":"bug-16","useSoundClassifications":false,"prompt":"What errors and inconsistencies in the following files, why are they significant, and how can I fix them? Format the response as markdown list of sentences with the file names in bold. Use the file names as headings.","useFileMetadata":false,"acceptedFileExtensions":"","name":"Find Errors"}',
  "Extract URLs":
    '{"useSoundClassifications":false,"name":"Extract URLs","acceptedFileExtensions":"","icon":"link-16","prompt":"Extract URLs from the following files and list them as markdown links","useFileMetadata":false}',
  "Create Slides":
    '{"acceptedFileExtensions":"","name":"Create Slides","useSoundClassifications":false,"prompt":"Generate 3 or more slideshow slides for each of the following files based on their content. Each slide should have 3 or 4 meaningful bullet points. Organize the slides by topic. Format the slides as markdown lists with \'---\' separating each slide. Describe an image to include with each slide. Suggest links related to each slide\'s content. Provide an appropriate title for the slideshow at the beginning of the response.","icon":"play-16","useFileMetadata":false}',
  "Create Action Items":
    '{"name":"Create Action Items","icon":"calendar-16","acceptedFileExtensions":"","useSoundClassifications":false,"useFileMetadata":false,"prompt":"Generate a markdown list of action items from the following files, unique a unique identifier for each item as bold headings. If there are any errors in the files, make action items to fix them. In a sublist of each item, provide a description, priority, estimated level of difficulty, and reasonable duration for the task."}',
  "Create Flashcards":
    '{"useSoundClassifications":false,"prompt":"Create 3 Anki flashcards based on the content of the following files. Format the response as markdown with the bold questions and plaintext answers. Separate each entry with \'---\'.","name":"Create Flashcards","acceptedFileExtensions":"","icon":"blank-document-16","useFileMetadata":false}',
  "Make Jingle":
    '{"useFileMetadata":false,"name":"Make Jingle","useSoundClassifications":true,"acceptedFileExtensions":"","icon":"music-16","minNumFiles":"1","prompt":"Create short, memorable jingles summarizing the main ideas in each of the following files, using the file names as headings."}',
  "Make Song":
    '{"minNumFiles":"1","acceptedFileExtensions":"","prompt":"Make a song based on the content of the following files. Provide a name for the song.","name":"Make Song","useFileMetadata":false,"useSoundClassifications":true,"icon":"music-16"}',
  "Detect Bias":
    '{"useFileMetadata":false,"name":"Detect Bias","useSoundClassifications":false,"acceptedFileExtensions":"","icon":"chevron-right-16","minNumFiles":"1","prompt":"Identify and explain the significance of any biases in the content of the following files. Discuss what the risks and dangers of those biases are, and discuss how those risks could be minimized."}',
  "Write Caption":
    '{"prompt":"Write a two-sentence caption for these files in the style of a typical image caption, based on their contents. Use the file names as headings. The caption should summarize the content and describe its overall purpose and significance.","acceptedFileExtensions":"","useFileMetadata":false,"icon":"text-cursor-16","useSoundClassifications":true,"minNumFiles":"1","name":"Write Caption"}',
  "Write Abstract":
    '{"prompt":"Write an abstract for the following files in the style of an academic research paper. Use the file names as headings. If the abstract includes a list, briefly describe it instead of listing all elements.","acceptedFileExtensions":"","name":"Write Abstract","useFileMetadata":false,"minNumFiles":"1","icon":"text-cursor-16","useSoundClassifications":false}',
  "Write Conclusion":
    '{"useSoundClassifications":false,"minNumFiles":"1","prompt":"Write conclusions for the following files in the style of the rest of their content, using the file names as headers. The conclusion should wrap up the meaning, purpose, significance, pitfalls, room to improvement, and suggest plans for future work.","icon":"text-cursor-16","name":"Write Conclusion","useFileMetadata":false,"acceptedFileExtensions":""}',
  "Write Discussion":
    '{"acceptedFileExtensions":"","useFileMetadata":false,"prompt":"Write a new discussion section for each of the following files in the style of an academic research paper. The discussion should be past tense and highlight the paper\'s successes. Use the file names as headings.","useSoundClassifications":false,"name":"Write Discussion","minNumFiles":"1","icon":"text-cursor-16"}',
  "Write Introduction":
    '{"minNumFiles":"1","prompt":"Write improved introduction sections for the following files in the style of an academic research paper. Use the file names as headings. The introductions must be at least 3 paragraphs long and describe what the file\'s contents are about, in future tense, as well as provide background information and a summary of the results. If the introduction includes a list, briefly describe the list instead of listing all elements.","acceptedFileExtensions":"","icon":"text-cursor-16","name":"Write Introduction","useFileMetadata":false,"useSoundClassifications":false}',
  "Assess Academic Validity":
    '{"useFileMetadata":false,"useSoundClassifications":false,"name":"Assess Academic Validity","prompt":"Assess the academic validity of the following files based on their contents, the methodologies described within, and any results obtained. Use the file names as headings.","acceptedFileExtensions":"","icon":"book-16","minNumFiles":"1"}',
  "Pattern Analysis":
    '{"useSoundClassifications":true,"useFileMetadata":false,"minNumFiles":"1","name":"Pattern Analysis","prompt":"Identify and describe any patterns or trends in the content of the following files. Use the file names as headers.","acceptedFileExtensions":"","icon":"line-chart-16"}',
  "Extract Vocabulary":
    '{"minNumFiles":"1","useFileMetadata":false,"icon":"book-16","name":"Extract Vocabulary","useSoundClassifications":false,"acceptedFileExtensions":"","prompt":"Extract the most difficult vocabulary words from the following files and define them."}',
  "Compose Tweet":
    '{"acceptedFileExtensions":"","useFileMetadata":false,"icon":"bird-16","minNumFiles":"1","prompt":"Compose a tweet based on the following files:","name":"Compose Tweet","useSoundClassifications":true}',
};
