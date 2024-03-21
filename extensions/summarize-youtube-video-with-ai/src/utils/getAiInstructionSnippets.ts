export function getSummaryBlockSnippet(
  index: number,
  splitTranscripts: number,
  summaryBlock: string,
  MAX_CHARS: number
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
