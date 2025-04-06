#!/usr/bin/env python3
"""
A Python script to convert markdown text to Tana Paste format.
This script implements the same conversion logic as the Raycast extension.
"""

import re
from datetime import datetime

class Line:
    """Represents a line of text with its structure."""
    def __init__(self, content, indent, raw, is_header, is_code_block, parent=None):
        self.content = content
        self.indent = indent
        self.raw = raw
        self.is_header = is_header
        self.is_code_block = is_code_block
        self.parent = parent

class ParsedDate:
    """Represents a parsed date with its type and value."""
    def __init__(self, type, value, is_processed=False):
        self.type = type  # 'simple', 'time', 'week', or 'duration'
        self.value = value
        self.is_processed = is_processed

def parse_line(line):
    """Parse a line to determine its structure."""
    raw = line
    
    # Calculate indent level based on spaces
    match = re.match(r'^(\s*)', line)
    spaces = len(match.group(1)) if match else 0
    indent = spaces // 2
    
    # Get content without indentation
    content = line[spaces:].rstrip()
    
    # Detect if it's a header
    is_header = content.startswith('#')
    
    # Detect if it's a code block
    is_code_block = content.startswith('```')
    
    return Line(content, indent, raw, is_header, is_code_block)

def build_hierarchy(lines):
    """
    Build the hierarchy by linking lines to their parents
    
    Enhanced to properly nest headings based on their level (H1, H2, etc.)
    and to handle numbered headers like '### 1. Context Awareness:' correctly
    """
    if not lines:
        return lines
    
    result = lines.copy()
    
    # Track the most recent header at each level
    # headers_at_level[0] = H1, headers_at_level[1] = H2, etc.
    headers_at_level = []
    
    # Track section headers (headings with numbers like "1. Title")
    section_headers = {}
    
    last_parent_at_level = [-1]
    in_code_block = False
    code_block_parent = None
    current_section = -1
    
    # First pass - identify numbered section headers
    for i, line in enumerate(result):
        content = line.content.strip()
        if line.is_header and re.match(r'^#+\s+\d+\.', content):
            level = len(re.match(r'^#+', content).group(0)) if re.match(r'^#+', content) else 1
            section_headers[i] = level
    
    # Second pass - build hierarchy with special handling for sections
    for i, line in enumerate(result):
        content = line.content.strip()
        
        # Skip empty lines
        if not content:
            continue
        
        # Handle code blocks
        if line.is_code_block or in_code_block:
            if not in_code_block:
                in_code_block = True
                code_block_parent = last_parent_at_level[-1]
            line.parent = code_block_parent
            if line.is_code_block and in_code_block:
                in_code_block = False
                code_block_parent = None
            continue
        
        # Handle headers
        if line.is_header:
            level = len(re.match(r'^#+', content).group(0)) if re.match(r'^#+', content) else 1
            
            # Check if this is a numbered header (e.g., "### 1. Context Awareness")
            is_numbered_header = bool(re.match(r'^#+\s+\d+\.', content))
            
            # Find the parent for this header based on heading levels
            if level == 1:
                # Top-level (H1) headings are at the root
                line.parent = -1
                current_section = -1
            else:
                # Subheadings (H2+) are children of the most recent header one level up
                # For example, H2s are children of the most recent H1
                parent_idx = -1
                if level > 1 and level - 2 < len(headers_at_level):
                    parent_idx = headers_at_level[level - 2]
                line.parent = parent_idx
                
                # If this is a numbered header, set it as the current section
                if is_numbered_header:
                    current_section = i
            
            # Update the header tracking for this level
            if level - 1 >= len(headers_at_level):
                headers_at_level.extend([None] * (level - len(headers_at_level)))
            headers_at_level[level - 1] = i
            
            # Clear header tracking for all deeper levels
            # (when we see an H2, we clear tracked H3s, H4s, etc.)
            headers_at_level = headers_at_level[:level]
            
            # Reset parent tracking at this level for content under this header
            last_parent_at_level = last_parent_at_level[:level + 1]
            last_parent_at_level.append(i)
            
            continue
            
        # Special case for lines that look like section content
        # These are lines like "**Definition:**" which should be children of the section
        if current_section >= 0 and re.match(r'^\*\*[^*:]+:\*\*', content):
            line.parent = current_section
            last_parent_at_level = [current_section]
            continue
        
        # Handle list items and content
        effective_indent = line.indent
        
        # Find the appropriate parent
        while len(last_parent_at_level) > effective_indent + 1:
            last_parent_at_level.pop()
        
        # Content is parented to the most recent element at the previous indentation level
        if effective_indent < len(last_parent_at_level):
            line.parent = last_parent_at_level[effective_indent]
        else:
            # If we're in a section and this is a direct child, parent to the section
            if current_section >= 0 and effective_indent <= 1:
                line.parent = current_section
            else:
                line.parent = -1
        
        # Update parent tracking at this level
        if effective_indent + 1 >= len(last_parent_at_level):
            last_parent_at_level.extend([i] * (effective_indent + 1 - len(last_parent_at_level) + 1))
        else:
            last_parent_at_level[effective_indent + 1] = i
    
    return result

def get_month_number(month):
    """Convert month abbreviation to number (01-12)."""
    months = {
        'January': '01', 'Jan': '01',
        'February': '02', 'Feb': '02',
        'March': '03', 'Mar': '03',
        'April': '04', 'Apr': '04',
        'May': '05',
        'June': '06', 'Jun': '06',
        'July': '07', 'Jul': '07',
        'August': '08', 'Aug': '08',
        'September': '09', 'Sep': '09',
        'October': '10', 'Oct': '10',
        'November': '11', 'Nov': '11',
        'December': '12', 'Dec': '12'
    }
    return months.get(month, '01')

def parse_date(text):
    """Parse a date string into its components."""
    # Already a Tana date reference
    if text.startswith('[[date:') and text.endswith(']]'):
        return ParsedDate('simple', text, True)

    # Week format
    week_match = re.match(r'^Week (\d{1,2}),\s*(\d{4})$', text)
    if week_match:
        week = week_match.group(1)
        year = week_match.group(2)
        week_padded = week.zfill(2)
        return ParsedDate('week', f"{year}-W{week_padded}")

    # Week range
    week_range_match = re.match(r'^Weeks (\d{1,2})-(\d{1,2}),\s*(\d{4})$', text)
    if week_range_match:
        week1 = week_range_match.group(1)
        week2 = week_range_match.group(2)
        year = week_range_match.group(3)
        week1_padded = week1.zfill(2)
        week2_padded = week2.zfill(2)
        return ParsedDate('duration', f"{year}-W{week1_padded}/W{week2_padded}")

    # ISO date with time
    iso_time_match = re.match(r'^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$', text)
    if iso_time_match:
        date, time = iso_time_match.groups()
        return ParsedDate('time', f"{date} {time}")

    # Legacy format with time
    legacy_time_match = re.match(
        r'^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+)?([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})(?:,\s*(\d{1,2}):(\d{2})\s*(AM|PM))?$',
        text
    )
    if legacy_time_match:
        _, month, day, year, hour, min, ampm = legacy_time_match.groups()
        if hour and min and ampm:
            h = int(hour)
            adjusted_hour = (h + 12 if ampm == 'PM' and h < 12 else 0 if ampm == 'AM' and h == 12 else h)
            return ParsedDate('time', f"{year}-{get_month_number(month)}-{day.zfill(2)} {adjusted_hour:02d}:{min}")
        return ParsedDate('simple', f"{year}-{get_month_number(month)}-{day.zfill(2)}")

    # Duration with mixed formats
    duration_match = re.match(
        r'^([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*-\s*([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})$',
        text
    )
    if duration_match:
        _, month1, day1, month2, day2, year = duration_match.groups()
        return ParsedDate('duration', f"{year}-{get_month_number(month1)}-{day1.zfill(2)}/{year}-{get_month_number(month2)}-{day2.zfill(2)}")

    # ISO duration
    iso_duration_match = re.match(r'^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$', text)
    if iso_duration_match:
        _, start, end = iso_duration_match.groups()
        return ParsedDate('duration', f"{start}/{end}")

    # Simple ISO date
    iso_match = re.match(r'^(\d{4}-\d{2}-\d{2})$', text)
    if iso_match:
        return ParsedDate('simple', iso_match.group(1))

    # Month and year
    month_year_match = re.match(r'^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+)?([A-Z][a-z]+)(?:\s+)?(?:⌘\s+)?(\d{4})$', text)
    if month_year_match:
        _, month, year = month_year_match.groups()
        return ParsedDate('simple', f"{year}-{get_month_number(month)}")

    # Year only
    year_match = re.match(r'^(?:⌘\s+)?(\d{4})$', text)
    if year_match:
        return ParsedDate('simple', year_match.group(1))

    return None

def format_tana_date(date):
    """Format a parsed date into Tana format."""
    if date.is_processed:
        return date.value
    
    return f"[[date:{date.value}]]"

def convert_dates(text):
    """Convert markdown date formats to Tana date format."""
    # First protect URLs and existing references
    protected_items = []
    text = re.sub(r'(?:\[\[.*?\]\]|https?://[^\s)]+|\[[^\]]+\]\([^)]+\))', 
                 lambda m: f"__PROTECTED_{len(protected_items)}__" and protected_items.append(m.group(0)) or f"__PROTECTED_{len(protected_items)-1}__",
                 text)

    # Process dates
    date_pattern = r'(?:\[\[date:)?(?:\[\[.*?\]\]|\d{4}(?:-\d{2}(?:-\d{2})?)?(?:\s+\d{2}:\d{2})?(?:\/(?:\[\[.*?\]\]|\d{4}(?:-\d{2}(?:-\d{2})?)?(?:\s+\d{2}:\d{2})?))?)(?:\]\])?|(?:Week \d{1,2},\s*\d{4})|(?:Weeks \d{1,2}-\d{1,2},\s*\d{4})|(?:[A-Z][a-z]+\s+(?:⌘\s+)?\d{4})|(?:[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?,\s*\d{4}(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM))?)|(?:[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?\s*-\s*[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?,\s*\d{4})'
    text = re.sub(date_pattern, 
                 lambda m: format_tana_date(parse_date(m.group(0))) if parse_date(m.group(0)) else m.group(0),
                 text)

    # Restore protected content
    text = re.sub(r'__PROTECTED_(\d+)__', 
                 lambda m: protected_items[int(m.group(1))],
                 text)

    return text

def convert_fields(text):
    """
    Convert markdown fields to Tana fields.
    
    Fix for issue #2: "Regular text with colons incorrectly converted to fields"
    This function is now smarter about when to convert text with colons to fields.
    It uses heuristics to distinguish between descriptive text with colons and actual fields.
    """
    # Skip if already contains a field marker
    if '::' in text:
        return text
    
    # Skip if it's a table row
    if '|' in text:
        return text
    
    # Check for patterns that indicate colons in regular text rather than fields
    def is_likely_regular_text(key, value, prefix, full_line):
        # If this isn't a list item and doesn't look like a metadata block, it's likely regular text
        is_standalone_text = not prefix and not full_line.strip().startswith('-')
        if is_standalone_text:
            return True
        
        # Check for numbered list items (1., 2., etc.) - usually not fields
        if re.match(r'^\s*\d+\.\s+', full_line):
            return True
        
        # Common words/phrases that indicate instructional content, not fields
        instructional_phrases = [
            'step', 'how to', 'note', 'example', 'tip', 'warning', 'caution', 'important', 
            'remember', 'click', 'select', 'choose', 'press', 'type', 'enter', 'copy', 'paste',
            'invoke', 'generate', 'hook', 'connect', 'create', 'toggle', 'shortcut', 'using', 'next',
            'first', 'second', 'third', 'fourth', 'fifth', 'last', 'final'
        ]
        
        # If the key contains instructional phrases, it's likely not a field
        if any(phrase in key.lower() for phrase in instructional_phrases):
            return True
        
        # UI elements often followed by instructions, not field values
        ui_elements = [
            'window', 'dialog', 'menu', 'button', 'link', 'option', 'panel', 'screen',
            'tab', 'toolbar', 'sidebar', 'modal', 'keyboard', 'mouse'
        ]
        
        # If the key contains UI elements, it's likely instructions
        if any(element in key.lower() for element in ui_elements):
            return True
        
        # If the value contains instructional language, it's likely not a field
        if re.search(r'press|click|select|use|open|go to|install|save|using', value, re.I):
            return True
        
        # If the value starts with an article or preposition, it's likely a sentence
        if re.match(r'^(The|A|An|This|That|These|Those|To|In|On|At|By|With|From|For|About)\s', value, re.I):
            return True
        
        # If the value contains parentheses indicating field status
        if '(field)' in value or '(not a field)' in value:
            return '(not a field)' in value
        
        # If the value contains punctuation common in natural language
        has_punctuation = re.search(r'[;,()]', value) or ' - ' in value
        is_field_test = re.search(r'\([^)]*field[^)]*\)', value, re.I)
        if has_punctuation and not is_field_test:
            return True
        
        # Likely patterns for real fields - used to identify actual fields
        likely_field_patterns = [
            # Project metadata
            'name', 'title', 'status', 'priority', 'assignee', 'tag', 'category', 'owner',
            'due date', 'start date', 'created', 'updated', 'version', 'id', 'type', 'format',
            
            # Content metadata
            'author', 'publisher', 'published', 'isbn', 'url', 'link',
            
            # Common fields
            'email', 'phone', 'address', 'location', 'property', 'completion'
        ]
        
        # If key matches common field patterns, it's likely a real field
        for pattern in likely_field_patterns:
            if (key.lower() == pattern or 
                key.lower().startswith(pattern + ' ') or 
                key.lower().endswith(' ' + pattern)):
                return False  # Not regular text, it's a field
        
        # In the context of a markdown list with a dash (-)
        # If we have a simple "Key: Value" format with a short value, it's more likely to be a field
        if prefix and len(key.split(' ')) <= 3:
            # Simple values are likely fields
            if len(value.split(' ')) <= 3 and not re.search(r'[;,():"\']+', value):
                return False  # Not regular text, it's a field
            
            # Check for uppercase first letter in key - often indicates a field
            if key[0] == key[0].upper() and len(value.split(' ')) <= 5:
                return False  # Not regular text, it's a field
        
        # When in doubt with longer content, assume it's regular text
        return True
    
    return re.sub(r'^(\s*[-*+]\s+)?([^:\n]+):\s+([^\n]+)$',
                 lambda m: (m.group(0) if is_likely_regular_text(m.group(2), m.group(3), m.group(1), m.group(0)) 
                           else f"{m.group(1) or ''}{m.group(2)}::{m.group(3)}"),
                 text,
                 flags=re.MULTILINE)

def process_inline_formatting(text):
    """
    Process inline formatting with special handling for bold text.
    
    Preserves bold text format and ensures it's properly rendered in Tana.
    """
    # First protect URLs and existing references
    protected_items = []
    
    def protect_item(match):
        protected_items.append(match.group(0))
        return f"__PROTECTED_{len(protected_items)-1}__"
        
    # Protect URLs and existing references
    text = re.sub(r'(\[\[.*?\]\]|https?://[^\s)]+)',
                 protect_item,
                 text)
                 
    # We must handle the bold format first - this part is key
    # This approach just keeps bold elements as they are
    bold_elements = []
    
    def save_bold(match):
        # Save the bold text as-is without modification
        content = match.group(1)
        key = f"__BOLD_{len(bold_elements)}__"
        bold_elements.append(f"**{content}**")
        return key
    
    # Extract and protect bold text
    text = re.sub(r'\*\*([^*]+)\*\*', save_bold, text)
    
    # Process other formatting
    text = re.sub(r'\*([^*]+)\*', r'__\1__', text)  # Italic
    text = re.sub(r'==([^=]+)==', r'^^\1^^', text)  # Highlight
    
    # Handle image syntax
    text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)',          
                 lambda m: f"{m.group(1)}::!{m.group(1)} {m.group(2)}" if m.group(1) else f"!Image {m.group(2)}",
                 text)
    
    # Handle link syntax
    link_items = {}
    
    def process_link(match):
        key = f"__LINK_{len(link_items)}__"
        link_items[key] = f"{match.group(1)} {match.group(2)}"
        return key
        
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', process_link, text)
    
    # Preserve bracketed elements that are not links
    text = re.sub(r'\[([^\]]+)\]', protect_item, text)
    
    # Restore links
    for key, value in link_items.items():
        text = text.replace(key, value)
    
    # Restore bold elements last
    for i, bold in enumerate(bold_elements):
        text = text.replace(f"__BOLD_{i}__", bold)
    
    # Restore protected content
    for i, item in enumerate(protected_items):
        text = text.replace(f"__PROTECTED_{i}__", item)
    
    return text

def process_code_block(lines):
    """Process code blocks - just extract the content as plain text."""
    return '\n'.join(line.strip() for line in lines[1:-1])

def process_table_row(text):
    """Process table row."""
    return ' | '.join(cell.strip() for cell in text.split('|') if cell.strip())

def process_limitless_pendant_transcription(text):
    """Process a line in Limitless Pendant transcription format."""
    # Check if it matches the Limitless Pendant format
    match = re.match(r'^>\s*\[(.*?)\]\(#startMs=\d+&endMs=\d+\):\s*(.*?)$', text)
    if not match:
        return text
    
    speaker = match.group(1)
    content = match.group(2)
    
    # Format as simple "{Speaker}: {Content}" (no fields)
    return f"{speaker}: {content}"

def is_limitless_pendant_transcription(text):
    """Detect if text is a Limitless Pendant transcription."""
    # Check for multiple lines in the Limitless Pendant format
    lines = text.split('\n')
    pendant_format_count = 0
    
    for line in lines:
        if re.match(r'^>\s*\[(.*?)\]\(#startMs=\d+&endMs=\d+\):', line):
            pendant_format_count += 1
        
        # If we found multiple matching lines, it's likely a Limitless Pendant transcription
        if pendant_format_count >= 3:
            return True
    
    return False

def convert_to_tana(input_text):
    """
    Convert markdown to Tana format
    
    Enhanced to properly indent content under headings without using Tana's heading format
    and to correctly handle formatting from Claude's AI outputs
    """
    if not input_text:
        return "No text selected."
    
    # Check if this is a Limitless Pendant transcription
    is_pendant_transcription = is_limitless_pendant_transcription(input_text)
    
    # Split into lines and parse
    lines = [parse_line(line) for line in input_text.split('\n')]
    
    # Build hierarchy
    hierarchical_lines = build_hierarchy(lines)
    
    # Map to store each line's indentation level in the output
    indentation_levels = {}
    
    # Start with root level at 0
    indentation_levels[-1] = 0
    
    # Identify section headers (numbered headings)
    section_headers = set()
    section_content = {}
    
    for i, line in enumerate(hierarchical_lines):
        content = line.content.strip()
        if not content:
            continue
            
        if line.is_header and re.match(r'^#+\s+\d+\.', content):
            section_headers.add(i)
            section_content[i] = []
    
    # First pass to determine indentation levels
    for i, line in enumerate(hierarchical_lines):
        if not line.content.strip():
            continue
        
        parent_index = line.parent if line.parent is not None else -1
        
        # Add to section content if parented to a section header
        if parent_index in section_headers:
            section_content[parent_index].append(i)
        
        parent_level = indentation_levels.get(parent_index, 0)
        
        # Determine indentation level
        if line.is_header:
            level = len(re.match(r'^#+', line.content.strip()).group(0)) if re.match(r'^#+', line.content.strip()) else 1
            
            # The indentation for a header is based on its header level
            # H1 = level 0, H2 = level 1, etc.
            indentation_levels[i] = level - 1
        else:
            # Special case for content directly under a section header
            if parent_index in section_headers:
                # Content under a section header should be indented one level deeper
                indentation_levels[i] = indentation_levels[parent_index] + 1
            else:
                # Special case for Limitless Pendant transcription lines - indent them deeper
                if is_pendant_transcription and line.content.strip().startswith('>'):
                    # Find the current section this line belongs to
                    current_section_idx = parent_index
                    while current_section_idx >= 0 and not hierarchical_lines[current_section_idx].is_header:
                        current_section_idx = hierarchical_lines[current_section_idx].parent if hierarchical_lines[current_section_idx].parent is not None else -1
                    
                    if current_section_idx >= 0:
                        # Get the header level
                        header_content = hierarchical_lines[current_section_idx].content.strip()
                        header_level = len(re.match(r'^#+', header_content).group(0)) if re.match(r'^#+', header_content) else 1
                        
                        # Indent as if it's one level deeper than the section header
                        indentation_levels[i] = header_level
                    else:
                        # Default to parent level + 2 if we can't find a header
                        indentation_levels[i] = parent_level + 2
                else:
                    # Normal content indentation is one more than its parent
                    indentation_levels[i] = parent_level + 1
    
    # Generate output
    output = ["%%tana%%"]
    in_code_block = False
    code_block_lines = []
    
    # Second pass to generate the output
    for i, line in enumerate(hierarchical_lines):
        content = line.content.strip()
        if not content:
            continue
        
        # Use the indentation level we determined in the first pass
        level = indentation_levels.get(i, 0)
        indent = "  " * level
        
        # Handle code blocks
        if line.is_code_block or in_code_block:
            if not in_code_block:
                in_code_block = True
                code_block_lines = [line.raw]
            elif line.is_code_block:
                in_code_block = False
                code_block_lines.append(line.raw)
                output.append(f"{indent}- {process_code_block(code_block_lines)}")
                code_block_lines = []
            else:
                code_block_lines.append(line.raw)
            continue
        
        # Process line content
        processed_content = content
        
        # Handle headers - convert to regular text without using Tana's heading format
        if line.is_header:
            match = re.match(r'^(#{1,6})\s+(.+)$', content)
            if match:
                # Just use the header text without the !! prefix
                processed_content = match.group(2)
        else:
            # Check if this is a Limitless Pendant transcription line
            if is_pendant_transcription and processed_content.startswith('>'):
                processed_content = process_limitless_pendant_transcription(processed_content)
            else:
                # Remove list markers but preserve checkboxes
                processed_content = re.sub(r'^[-*+]\s+(?!\[[ x]\])', '', processed_content)
                
                # Convert fields first
                processed_content = convert_fields(processed_content)
                
                # Then convert dates
                processed_content = convert_dates(processed_content)
                
                # Finally process inline formatting
                processed_content = process_inline_formatting(processed_content)
        
        output.append(f"{indent}- {processed_content}")
    
    return '\n'.join(output)

def chunk_content(content, max_chunk_size=90000):
    """
    Split content into chunks that are smaller than the specified size.
    Each chunk will try to break at a logical point (after a complete node).
    Each chunk will start with the Tana header.
    """
    if len(content) <= max_chunk_size:
        return [content]
    
    chunks = []
    current_chunk = ["%%tana%%"]  # Start with header
    current_size = len("%%tana%%\n")  # Account for header and newline
    
    # Split content into lines, skipping the header if it exists
    lines = content.split('\n')
    if lines[0] == "%%tana%%":
        lines = lines[1:]
    
    for line in lines:
        line_size = len(line) + 1  # +1 for the newline character
        
        # If adding this line would exceed the chunk size and we already have content
        if current_size + line_size > max_chunk_size and len(current_chunk) > 1:  # > 1 because we always have the header
            # Join the current chunk and add it to chunks
            chunks.append('\n'.join(current_chunk))
            current_chunk = ["%%tana%%"]  # Start new chunk with header
            current_size = len("%%tana%%\n")  # Reset size with header
        
        current_chunk.append(line)
        current_size += line_size
    
    # Add the last chunk if it exists
    if len(current_chunk) > 1:  # > 1 because we always have the header
        chunks.append('\n'.join(current_chunk))
    
    return chunks

def main():
    """Main function to handle command line arguments and file processing."""
    import argparse
    import sys
    import os
    
    parser = argparse.ArgumentParser(description='Convert markdown text to Tana Paste format')
    parser.add_argument('input_file', help='Input markdown file to convert')
    parser.add_argument('-o', '--output', help='Output file (default: stdout)')
    parser.add_argument('--chunk-size', type=int, default=90000, help='Maximum size of each chunk in characters (default: 90000)')
    
    args = parser.parse_args()
    
    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            input_text = f.read()
        
        tana_output = convert_to_tana(input_text)
        
        # Split into chunks if needed
        chunks = chunk_content(tana_output, args.chunk_size)
        
        if args.output:
            # If output is specified, create numbered files
            base_name, ext = os.path.splitext(args.output)
            for i, chunk in enumerate(chunks, 1):
                chunk_file = f"{base_name}_{i}{ext}"
                with open(chunk_file, 'w', encoding='utf-8') as f:
                    f.write(chunk)
                print(f"Created chunk {i} in {chunk_file}")
        else:
            # If no output specified, print chunks with separators
            for i, chunk in enumerate(chunks, 1):
                print(f"\n=== Chunk {i} ===\n")
                print(chunk)
                print("\n" + "="*50 + "\n")
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 