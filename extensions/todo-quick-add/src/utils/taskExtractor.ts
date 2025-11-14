/**
 * SmartTaskExtractor - TypeScript port from Swift
 * Intelligently extracts the core task from natural language input
 * Removes filler words, metadata indicators, and temporal expressions
 */

export interface ExtractionResult {
  taskTitle: string;
  originalText: string;
  removedPhrases: string[];
}

/**
 * Extracts the core task title from natural language input
 * Example: "we gotta sand the roof by tuesday and its high priority" → "Sand the roof"
 */
export function extractTaskTitle(text: string): ExtractionResult {
  let workingText = text;
  const removedPhrases: string[] = [];

  // Step 1: Remove explicit markers and their content
  workingText = removeExplicitMarkers(workingText, removedPhrases);

  // Step 2: Remove temporal expressions
  workingText = removeTemporalExpressions(workingText, removedPhrases);

  // Step 3: Remove priority indicators
  workingText = removePriorityIndicators(workingText, removedPhrases);

  // Step 4: Remove conversational filler
  workingText = removeConversationalFiller(workingText);

  // Step 5: Clean up whitespace
  workingText = workingText.replace(/\s+/g, " ").trim();

  // Capitalize first letter
  if (workingText.length > 0) {
    workingText = workingText.charAt(0).toUpperCase() + workingText.slice(1);
  }

  return {
    taskTitle: workingText,
    originalText: text,
    removedPhrases,
  };
}

// MARK: - Removal Steps

/**
 * Removes #tags, @priorities, and /dates
 */
function removeExplicitMarkers(text: string, removedPhrases: string[]): string {
  let result = text;

  // Remove #tags
  const tagPattern = /#\w+/g;
  const tagMatches = result.match(tagPattern);
  if (tagMatches) {
    tagMatches.forEach((match) => removedPhrases.push(match));
    result = result.replace(tagPattern, "");
  }

  // Remove @priorities
  const priorityPattern = /@(high|medium|low|h|m|l)\b/gi;
  const priorityMatches = result.match(priorityPattern);
  if (priorityMatches) {
    priorityMatches.forEach((match) => removedPhrases.push(match));
    result = result.replace(priorityPattern, "");
  }

  // Remove /dates (everything after /)
  const datePattern = /\/[^@#\n]+/g;
  const dateMatches = result.match(datePattern);
  if (dateMatches) {
    dateMatches.forEach((match) => removedPhrases.push(match));
    result = result.replace(datePattern, "");
  }

  return result;
}

/**
 * Removes temporal expressions like "by tuesday", "tomorrow", "on friday", etc.
 */
function removeTemporalExpressions(text: string, removedPhrases: string[]): string {
  let result = text;

  const temporalPatterns = [
    // "by [time]"
    /\b(by|before|until)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|next\s+week|next\s+month|the\s+weekend|this\s+week|end\s+of\s+(week|month|day))\b/gi,

    // "on [day]"
    /\b(on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)\b/gi,

    // Standalone time expressions at end
    /\b(today|tomorrow|tonight|this\s+morning|this\s+afternoon|this\s+evening|tonight)\b/gi,

    // "in X days/weeks"
    /\bin\s+\d+\s+(days?|weeks?|months?|hours?)\b/gi,

    // Date formats like "12/25", "Dec 15", etc.
    /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?\b/gi,

    // Time expressions like "at 3pm", "by 5:30pm"
    /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi,
    /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi,
  ];

  for (const pattern of temporalPatterns) {
    const matches = result.match(pattern);
    if (matches) {
      matches.forEach((match) => removedPhrases.push(match));
      result = result.replace(pattern, "");
    }
  }

  return result;
}

/**
 * Removes priority indicators like "high priority", "urgent", "important", etc.
 */
function removePriorityIndicators(text: string, removedPhrases: string[]): string {
  let result = text;

  const priorityPatterns = [
    // "and its [priority]"
    /\band\s+(its?|it'?s)\s+(high|medium|low|urgent|important|critical)(\s+priority)?\b/gi,

    // Standalone priority words
    /\b(urgent|asap|critical|important|high\s+priority|medium\s+priority|low\s+priority|priority|crucial|vital|essential|pressing|emergency)\b/gi,

    // "make it urgent/important"
    /\bmake\s+it\s+(urgent|important|critical|high\s+priority)\b/gi,

    // "this is urgent/important"
    /\bthis\s+is\s+(urgent|important|critical|high\s+priority)\b/gi,
  ];

  for (const pattern of priorityPatterns) {
    const matches = result.match(pattern);
    if (matches) {
      matches.forEach((match) => removedPhrases.push(match));
      result = result.replace(pattern, "");
    }
  }

  return result;
}

/**
 * Removes conversational filler like "I need to", "we gotta", "don't forget to", etc.
 */
function removeConversationalFiller(text: string): string {
  let result = text;

  const fillerPatterns = [
    // Task starters
    /^(i\s+)?(need|have|want|gotta|got\s+to|should|must|will|gonna|going\s+to|ought\s+to|better)\s+to\s+/gi,
    /^(we\s+)?(need|have|want|gotta|got\s+to|should|must|will|gonna|going\s+to)\s+to\s+/gi,
    /^(let'?s|let\s+us)\s+/gi,
    /^(don'?t\s+forget\s+to|remember\s+to|make\s+sure\s+to|be\s+sure\s+to)\s+/gi,

    // At start: "I/we/you should/need/want..."
    /^(i|we|you|he|she|they)\s+(need|want|should|must|have|gotta)\s+/gi,

    // Reminder phrases
    /^(reminder|note|todo):?\s+/gi,

    // Question forms
    /^(can|could|would|should)\s+(i|we|you)\s+/gi,

    // "to" at the start (leftover from above patterns)
    /^to\s+/gi,
  ];

  for (const pattern of fillerPatterns) {
    result = result.replace(pattern, "");
  }

  return result;
}
