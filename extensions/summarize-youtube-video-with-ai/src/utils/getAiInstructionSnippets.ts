export function getSummaryBlockSnippet(
  index: number,
  splitTranscripts: number,
  summaryBlock: string,
  MAX_CHARS: number,
) {
  return `Summarize this transcription of a youtube video.
    The transcription is split into parts and this is part ${index} of ${splitTranscripts}.
    Be as concise as possible.
    Do not use more then ${MAX_CHARS / splitTranscripts} characters.
    
    Here is the transcript: ${summaryBlock}`;
}

export function getAiInstructionSnippet(language: string, temporarySummary: string, transcript: string | undefined) {
  return `Summarize the following transcription of a youtube video as a list of the most important points each starting with a fitting emoji. Ignore Sponsor Segments and Video Sponsors. Answer in ${language}.
  
  Format:

  [Emoji] [List Item] &nbsp;&nbsp;
  
  Here is the transcript: ${temporarySummary.length > 0 ? temporarySummary : transcript}`;
}

export function getFollowUpQuestionSnippet(question: string, transcript: string) {
  return `The following text is the content of a video. Refer to it as video. You already summarized it for the person asking a question. Answer with a list starting with a fitting emoji. Ignore Sponsor Segments and Video Sponsors.
  
  Format:

  [Emoji] [List Item] &nbsp;&nbsp;
  
  Here is the transcript: ${transcript}. This is the question: ${question}`;
}
