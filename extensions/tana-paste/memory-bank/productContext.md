# Product Context

## Problem Statement
Users of Tana (a note-taking and knowledge management tool) often need to import content from other sources. However, Tana uses a specific node-based structure that requires manual formatting when pasting regular text or Markdown. This creates friction in the workflow and slows down the knowledge capture process.

## Solution
Tana Paste provides an automated way to convert text and Markdown to Tana's required format. It eliminates the need for manual reformatting by automatically:
- Converting headings to Tana nodes with proper indentation
- Transforming bullet points and numbered lists to Tana's structure
- Preserving hierarchical relationships between content
- Converting fields with colons to Tana's field format
- Handling special formatting like links, dates, and inline styles

## User Experience Goals
- **Seamless Integration**: Works directly with clipboard content in the Raycast workflow
- **Multiple Entry Points**: Different commands for different user needs (quick conversion, edit before conversion, etc.)
- **Speed**: Instant conversion with minimal user interaction required
- **Reliability**: Consistent and accurate conversion of complex structures
- **Flexibility**: Python script option for large documents or batch processing

## Target Users
- Knowledge workers who use Tana as their primary note-taking system
- Researchers collecting and organizing information from multiple sources
- Project managers organizing hierarchical data and tasks
- Anyone who needs to quickly transfer structured content into Tana

## Success Metrics
- Reduction in time spent formatting content for Tana
- Accuracy of conversion, particularly for complex nested structures
- Ability to handle edge cases in different types of Markdown content
- User satisfaction with the conversion process 