export const translationPrompt = `
  Context:
  I am learning [[nativeLanguage]].
  Help me to learn the word [[vocabulary]] like a native speaker teacher. 
  no need to mention the name of the native language, 
  and then again, explain the meaning of the word in detail with [[nativeLanguage]] as a professional translator with 1000 years of experience.


  If it's already in [[nativeLanguage]], translate it into English.
  If it's not in [[nativeLanguage]],explain it in the language of [[vocabulary]] first, then explain it into [[nativeLanguage]].
  If the [[vocabulary]] seems not to be a word, just guess what it might be, and let me know there might be a typo.

  If this word has different meanings,
  please list them separately and provide example sentences with the original text and translations.
  Make sure the result contains the original text and translations.

  Let's translate this word: "[[vocabulary]]"

  Step 1: First, identify what language this word is in
  Step 2: Translate "[[vocabulary]]" into [[nativeLanguage]]

  Format Instructions:
  
  Format the output as:
  ## [[vocabulary]]: [translation in [[nativeLanguage]]]

  ---
  ### Explanation in [[learningLanguage]]
  (start with sentence) 
  ---
  ### Explanation in [[nativeLanguage]]
  (start with sentence)
  ---
  ### Example sentences 
  example:
  1. example sentence 1
  - translation of example sentence 1
  2. example sentence 2
  - translation of example sentence 2
  ---
  ### Synonyms
  (if there is a word with a very similar spelling, mention it.)
 
  Please list any synonyms words or words with similar spelling or meaning, one per line.
  For each word, briefly explain how it is similar and how it differs (in [[nativeLanguage]]).
  Format like this:
  - synonyms1 in [[learningLanguage]] : brief explanation in [[nativeLanguage]]
  - synonyms2 in [[learningLanguage]] : brief explanation in [[nativeLanguage]]

  ---

  Above all, if you see a word that is not in [[learningLanguage]], explain it in the language of [[learningLanguage]] first, then explain it into [[nativeLanguage]].
`;
