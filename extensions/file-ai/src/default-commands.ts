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
    '{"name":"Extract Emails","acceptedFileExtensions":"","useFileMetadata":false,"prompt":"Extract emails from the following files and list them as markdown links:","icon":"envelope-16","useSoundClassifications":false}',
  "Find Errors":
    '{"icon":"bug-16","useSoundClassifications":false,"prompt":"What errors and inconsistencies in the following files, why are they significant, and how can I fix them? Format the response as markdown list of sentences with the file names in bold. Use the file names as headings.","useFileMetadata":false,"acceptedFileExtensions":"","name":"Find Errors"}',
  "Extract URLs":
    '{"useSoundClassifications":false,"name":"Extract URLs","acceptedFileExtensions":"","icon":"link-16","prompt":"Extract URLs from the following files and list them as markdown links","useFileMetadata":false}',
  "Create Slides":
    '{"acceptedFileExtensions":"","name":"Create Slides","useSoundClassifications":false,"prompt":"Generate 3 or more slideshow slides for each of the following files based on their content. Each slide should have 3 or 4 meaningful bullet points. Organize the slides by topic. Format the slides as markdown lists with \'---\' separating each slide. Describe an image to include with each slide. Suggest links related to each slide\'s content. Provide an appropriate title for the slideshow at the beginning of the response.","icon":"play-16","useFileMetadata":false}',
  "Create Action Items":
    '{"minNumFiles":"1","useSoundClassifications":false,"prompt":"Generate a markdown list of action items from the following files, using a unique identifier for each item as bold headings. If there are any errors in the files, make actions items to fix them. In a sublist of each item, provide a description, priority, estimated level of difficulty, reasonable duration for the task, and due date based on the the duration and today\'s date, \\"{{date}}\\". Here are the files:","icon":"calendar-16","acceptedFileExtensions":"","useFileMetadata":false,"name":"Create Action Items"}',
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
  "Extract Code":
    '{"useFileMetadata":false,"icon":"code-16","acceptedFileExtensions":"","name":"Extract Code","minNumFiles":"1","prompt":"Extract lines of code written in programming languages from the following files. Format the response as markdown code blocks. Place the programming language used in each block as the heading above it. Provide a brief description of what the code does below each block. Do not provide any other commentary.","useSoundClassifications":false}',
  "Meeting Agenda":
    '{"minNumFiles":"1","name":"Meeting Agenda","prompt":"Create a meeting agenda covering the contents of the following files. Use today\'s date and time, {{date}}, to provide headings and structure to the agenda.","icon":"app-window-list-16","useSoundClassifications":false,"acceptedFileExtensions":"","useFileMetadata":false}',
  "Compose Response":
    '{"name":"Compose Response","icon":"text-cursor-16","useFileMetadata":false,"minNumFiles":"1","acceptedFileExtensions":"","useSoundClassifications":false,"prompt":"Compose a response to the following files in the style of an email. Sign the email with the name \\"{{user}}\\""}',
  "Identify Gaps":
    '{"prompt":"Identify any gaps in understanding or content that occur in the following files. Use the file names as headings. Provide content to fill in the gaps.","useFileMetadata":false,"icon":"arrows-expand-16","useSoundClassifications":false,"name":"Identify Gaps","acceptedFileExtensions":"","minNumFiles":"1"}',
  "Suggest File AI Prompts":
    '{"acceptedFileExtensions":"","minNumFiles":"1","name":"Suggest File AI Prompts","icon":"paragraph-16","useSoundClassifications":true,"prompt":"Suggest prompts for an AI that can read the contents of selected files based on the contents of the following files. Use the file contents to create useful prompts that could act on the files. The AI does not have the ability to modify files or create new ones. All prompts should reference \\"the contents of the following files\\".","useFileMetadata":false}',
  "Suggest Hashtags":
    '{"useSoundClassifications":false,"prompt":"Suggest hashtags for the following files based on their contents. Use the file names as markdown headings.","acceptedFileExtensions":"","icon":"hashtag-16","name":"Suggest Hashtags","minNumFiles":"1","useFileMetadata":false}',
  "Extract Phone Numbers":
    '{"icon":"phone-16","acceptedFileExtensions":"","name":"Extract Phone Numbers","useFileMetadata":false,"useSoundClassifications":false,"prompt":"Identify all phone numbers in the following files and list them using markdown. Include anything that might be a phone number. If possible, provide the name of the person or company to which the phone number belongs.","minNumFiles":"1"}',
  "Create Notes":
    '{"prompt":"Create concise notes based on the following files. Discuss the meaning and significance of topics mentioned. Discuss any other relevant details and facts about the file. Format the response as a markdown list. Each list item should be 10 words for fewer. ","name":"Create Notes","minNumFiles":"1","acceptedFileExtensions":"","icon":"bullet-points-16","useFileMetadata":false,"useSoundClassifications":true}',
  "Suggest Tools":
    '{"prompt":"Suggest tools to use based on the topics discussed in the following files. Explain why each tool is relevant. Use the file names as headings. Do not provide any commentary other than the list of tools and their explanations.","useFileMetadata":false,"acceptedFileExtensions":"","icon":"wrench-screwdriver-16","name":"Suggest Tools","minNumFiles":"1","useSoundClassifications":false}',
  "Suggest Title":
    '{"useFileMetadata":false,"acceptedFileExtensions":"","prompt":"Suggest new titles for the following files based on their content and topics mentioned. Use the file names as headings.","name":"Suggest Title","useSoundClassifications":false,"minNumFiles":"1","icon":"text-16"}',
  "Metadata Analysis":
    '{"icon":"magnifying-glass-16","acceptedFileExtensions":"","name":"Metadata Analysis","useFileMetadata":false,"prompt":"I want you to give several insights about files based on their metadata and file type. Do not summarize the file content, but instead relate the metadata to the content in a meaningful way. Use metadata to suggest improvements to the content. Provide detailed explanations for your suggestions. Format your response as a paragraph summary. Use the file names as headings.\\nHere\'s the metadata:\\n{{metadata}}\\n\\nHere are the files:","minNumFiles":"1","useSoundClassifications":false}',
  "Suggest Improvements":
    '{"name":"Suggest Improvements","minNumFiles":"1","acceptedFileExtensions":"","useFileMetadata":false,"icon":"stars-16","useSoundClassifications":true,"prompt":"Suggest improvements to the content of the following files. Use the file names as headings. Format the response as a markdown list."}',
  "Make Poem":
    '{"name":"Make Poem","acceptedFileExtensions":"","minNumFiles":"1","useFileMetadata":false,"prompt":"Make rhyming poems about the the following files. Be creative and include references to the content and purpose of the file in unexpected ways. Do not summarize the file. Make each poem at least 3 stanzas long, but longer for longer files. Use the file names as markdown headings.","icon":"short-paragraph-16","useSoundClassifications":true}',
};
