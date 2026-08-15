#!/usr/bin/env python3
"""
Parse LAPACK/BLAS Fortran source files and generate markdown documentation.
"""
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

def extract_routine_name(filepath: Path) -> str:
    """Extract the routine name from the filepath."""
    return filepath.stem

def parse_fortran_types(content: str, routine_name: str) -> Dict[str, str]:
    """Extract parameter types from Fortran declarations."""
    param_types = {}
    
    # First, find the parameter list from the comment section (Definition section)
    # This is the SUBROUTINE line in comments (starts with *)
    comment_sub_match = re.search(
        rf'^\*\s*SUBROUTINE\s+{routine_name}\s*\((.*?)\)',
        content, re.IGNORECASE | re.MULTILINE | re.DOTALL
    )
    
    if not comment_sub_match:
        comment_sub_match = re.search(
            rf'^\*\s*(?:(?:DOUBLE PRECISION|REAL|INTEGER|COMPLEX|LOGICAL|CHARACTER)\s+)?FUNCTION\s+{routine_name}\s*\((.*?)\)',
            content, re.IGNORECASE | re.MULTILINE | re.DOTALL
        )
    
    if not comment_sub_match:
        return param_types
    
    # Get parameter names from comment declaration
    full_match = comment_sub_match.group(0)
    params_match = re.search(rf'{routine_name}\s*\((.*?)\)', full_match, re.IGNORECASE)
    if not params_match:
        return param_types
    
    params_str = params_match.group(1)
    param_names = [p.strip().upper() for p in params_str.split(',')]
    
    # Find declarations right after the comment subroutine line
    # Look for ".. Scalar Arguments .." and ".. Array Arguments .." sections
    decl_start = content.find(comment_sub_match.group(0)) + len(comment_sub_match.group(0))
    
    # Get the next ~500 characters which should contain the declarations
    decl_section = content[decl_start:decl_start + 1000]
    
    # Parse scalar arguments from comment section
    scalar_match = re.search(r'\*\s*\.\.\s*Scalar Arguments\s*\.\.\s*\n(.*?)(?:\*\s*\.\.|$)', 
                            decl_section, re.DOTALL | re.IGNORECASE)
    if scalar_match:
        scalar_text = scalar_match.group(1)
        # Process each line separately
        for line in scalar_text.split('\n'):
            line = line.strip().lstrip('*').strip()
            if not line or line.startswith('..'):
                continue
            type_match = re.match(r'((?:INTEGER|DOUBLE\s+PRECISION|REAL|COMPLEX\*?\d*|CHARACTER\*?\d*|LOGICAL))\s+(.*)', 
                                line, re.IGNORECASE)
            if type_match:
                var_type = type_match.group(1).strip()
                var_names = type_match.group(2).strip()
                for var_name in var_names.split(','):
                    var_name = var_name.strip().upper()
                    if var_name in param_names:
                        param_types[var_name] = var_type.lower()
    
    # Parse array arguments from comment section
    array_match = re.search(r'\*\s*\.\.\s*Array Arguments\s*\.\.\s*\n(.*?)(?:\*\s*\.\.|$)', 
                           decl_section, re.DOTALL | re.IGNORECASE)
    if array_match:
        array_text = array_match.group(1)
        for line in array_text.split('\n'):
            line = line.strip().lstrip('*').strip()
            if not line or line.startswith('..'):
                continue
            type_match = re.match(r'((?:INTEGER|DOUBLE\s+PRECISION|REAL|COMPLEX\*?\d*|CHARACTER\*?\d*|LOGICAL))\s+(.*)', 
                                line, re.IGNORECASE)
            if type_match:
                var_type = type_match.group(1).strip()
                var_decls = type_match.group(2).strip()
                var_matches = re.finditer(r'(\w+)\s*\(([^)]+)\)', var_decls)
                for var_match in var_matches:
                    var_name = var_match.group(1).strip().upper()
                    dimension = var_match.group(2).strip()
                    if var_name in param_names:
                        param_types[var_name] = f"{var_type.lower()}, dimension({dimension})"
    
    # If we didn't find declarations in comment section, try BLAS style (after actual subroutine)
    if not param_types:
        actual_sub_match = re.search(
            rf'^\s+SUBROUTINE\s+{routine_name}\s*\(([^)]*(?:\n[^)]*)*)\)',
            content, re.IGNORECASE | re.MULTILINE
        )
        
        if actual_sub_match:
            decl_start = content.find(actual_sub_match.group(0)) + len(actual_sub_match.group(0))
            decl_end_match = re.search(r'^\s*\*\s*={50,}', content[decl_start:], re.MULTILINE)
            
            if decl_end_match:
                decl_text = content[decl_start:decl_start + decl_end_match.start()]
                
                # Parse scalar arguments (BLAS style)
                scalar_match = re.search(r'\*\s*\.\.\s*Scalar Arguments\s*\.\.\s*\n(.*?)(?:\*\s*\.\.|$)', 
                                        decl_text, re.DOTALL | re.IGNORECASE)
                if scalar_match:
                    scalar_text = scalar_match.group(1)
                    for line in scalar_text.split('\n'):
                        if line.strip().startswith('*'):
                            continue
                        line = line.strip()
                        if not line:
                            continue
                        type_match = re.match(r'((?:INTEGER|DOUBLE\s+PRECISION|REAL|COMPLEX\*?\d*|CHARACTER\*?\d*|LOGICAL))\s+(.*)', 
                                            line, re.IGNORECASE)
                        if type_match:
                            var_type = type_match.group(1).strip()
                            var_names = type_match.group(2).strip()
                            for var_name in var_names.split(','):
                                var_name = var_name.strip().upper()
                                if var_name in param_names:
                                    param_types[var_name] = var_type.lower()
                
                # Parse array arguments (BLAS style)
                array_match = re.search(r'\*\s*\.\.\s*Array Arguments\s*\.\.\s*\n(.*?)(?:\*\s*\.\.|$)', 
                                       decl_text, re.DOTALL | re.IGNORECASE)
                if array_match:
                    array_text = array_match.group(1)
                    for line in array_text.split('\n'):
                        if line.strip().startswith('*'):
                            continue
                        line = line.strip()
                        if not line:
                            continue
                        type_match = re.match(r'((?:INTEGER|DOUBLE\s+PRECISION|REAL|COMPLEX\*?\d*|CHARACTER\*?\d*|LOGICAL))\s+(.*)', 
                                            line, re.IGNORECASE)
                        if type_match:
                            var_type = type_match.group(1).strip()
                            var_decls = type_match.group(2).strip()
                            var_matches = re.finditer(r'(\w+)\s*\(([^)]+)\)', var_decls)
                            for var_match in var_matches:
                                var_name = var_match.group(1).strip().upper()
                                dimension = var_match.group(2).strip()
                                if var_name in param_names:
                                    param_types[var_name] = f"{var_type.lower()}, dimension({dimension})"
    
    return param_types

def parse_fortran_file(filepath: Path) -> Optional[Dict]:
    """Parse a Fortran file and extract documentation."""
    try:
        with open(filepath, 'r', encoding='latin-1') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None
    
    # Extract the brief description
    brief_match = re.search(r'\*>\s*\\brief\s*<b>(.*?)</b>', content, re.IGNORECASE)
    brief = brief_match.group(1).strip() if brief_match else ""
    
    # Extract the function signature from comment
    signature_match = re.search(r'\*\s*SUBROUTINE\s+(\w+)\s*\((.*?)\)', content, re.IGNORECASE | re.DOTALL)
    is_function = False
    if not signature_match:
        # Try FUNCTION instead
        signature_match = re.search(r'\*\s*FUNCTION\s+(\w+)\s*\((.*?)\)', content, re.IGNORECASE | re.DOTALL)
        is_function = True
    
    if not signature_match:
        return None
    
    routine_name = signature_match.group(1).strip()
    params_str = signature_match.group(2).strip()
    param_names = [p.strip() for p in params_str.split(',')]
    
    # Extract parameter types from Fortran declarations
    param_types = parse_fortran_types(content, routine_name)
    
    # Extract purpose/description
    purpose_match = re.search(r'\*>\s*\\par\s+Purpose:.*?\*>\s*\\verbatim\s*(.*?)\*>\s*\\endverbatim', 
                             content, re.IGNORECASE | re.DOTALL)
    purpose = purpose_match.group(1).strip() if purpose_match else ""
    purpose = re.sub(r'\*>', '', purpose)  # Remove Doxygen markers
    purpose = re.sub(r'^\s*\*\s*', '', purpose, flags=re.MULTILINE)  # Remove leading * from lines
    
    # Extract arguments section
    args_section = re.search(r'\*\s*Arguments:\s*\*\s*=+\s*(.*?)(?=\*\s*Authors:|\*\s*  ={50,})', 
                            content, re.IGNORECASE | re.DOTALL)
    
    parameters = []
    if args_section:
        args_text = args_section.group(1)
        # Find all parameter blocks
        param_blocks = re.finditer(
            r'\*>\s*\\param\[(.*?)\]\s+(\w+)\s*\*>\s*\\verbatim\s*(.*?)\*>\s*\\endverbatim',
            args_text, re.DOTALL | re.IGNORECASE
        )
        
        for param_match in param_blocks:
            param_io = param_match.group(1).strip()  # in, out, in,out
            param_name = param_match.group(2).strip()
            param_desc = param_match.group(3).strip()
            param_desc = re.sub(r'\*>', '', param_desc)
            param_desc = re.sub(r'^\s*\*\s*', '', param_desc, flags=re.MULTILINE)
            
            # Extract the type info from the first line of description
            lines = param_desc.split('\n')
            first_line = lines[0].strip() if lines else ""
            rest_desc = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ""
            
            # The first line typically contains the type info
            type_info = ""
            if first_line:
                # Extract type from first line (e.g., "TRANSA is CHARACTER*1")
                type_match = re.match(r'^\w+\s+is\s+(.+?)(?=\s+On entry|$)', first_line, re.IGNORECASE)
                if type_match:
                    type_info = type_match.group(1).strip()
                else:
                    type_info = first_line
            
            # Combine the rest of the description
            full_desc = rest_desc if rest_desc else ""
            if not type_info and first_line:
                full_desc = param_desc
            
            parameters.append({
                'name': param_name,
                'io': param_io,
                'type_info': type_info,
                'description': full_desc,
                'fortran_type': param_types.get(param_name.upper(), "")
            })
    
    return {
        'name': routine_name,
        'brief': brief,
        'param_names': param_names,
        'param_types': param_types,
        'purpose': purpose,
        'parameters': parameters,
        'is_function': is_function
    }

def generate_markdown(routine_info: Dict) -> str:
    """Generate markdown documentation from parsed routine info."""
    md = ""
    
    # Generate formatted signature with types
    routine_type = "function" if routine_info.get('is_function') else "subroutine"
    routine_name = routine_info['name'].lower()
    
    # Build parameter list with types - each on its own line
    param_lines = []
    for param_name in routine_info['param_names']:
        param_name_clean = param_name.strip().upper()
        param_type = routine_info['param_types'].get(param_name_clean, "")
        
        if param_type:
            # Convert dimension variables to lowercase
            param_type_lower = re.sub(r'dimension\(([^)]+)\)', 
                                     lambda m: f"dimension({m.group(1).lower()})", 
                                     param_type)
            # Use space instead of tab between type and parameter name
            param_lines.append(f"{param_type_lower} {param_name.strip().lower()}")
        else:
            param_lines.append(f"{param_name.strip().lower()}")
    
    # Format signature with opening paren on same line as subroutine
    # Each parameter on its own line with proper indentation (two tabs)
    # Closing paren on its own line
    md += f"```fortran\n{routine_type} {routine_name} (\n"
    if param_lines:
        for i, param_line in enumerate(param_lines):
            if i < len(param_lines) - 1:
                md += f"\t\t{param_line},\n"
            else:
                md += f"\t\t{param_line}\n"
    md += ")\n```\n"
    
    # Add description without heading
    if routine_info['purpose']:
        md += f"{routine_info['purpose']}\n\n"
    
    # Add parameters section
    if routine_info['parameters']:
        md += f"## Parameters\n"
        for param in routine_info['parameters']:
            # Format: Parameter_name : Type [in/out]
            io_tag = f"[{param['io']}]" if param['io'] else ""
            type_info = param['type_info']
            
            # Capitalize first letter of type info
            if type_info:
                type_parts = type_info.split()
                type_info = ' '.join([p.capitalize() if p.lower() not in ['is', 'or', 'and', 'the', 'of', 'a', 'an'] else p for p in type_parts])
            
            md += f"{param['name'].capitalize()} : {type_info} {io_tag}\n"
            
            # Add description with > prefix
            if param['description']:
                desc_lines = param['description'].split('\n')
                for line in desc_lines:
                    line = line.strip()
                    if line:
                        md += f"> {line}\n"
            md += "\n"
    
    return md

def process_lapack_sources(src_dir: Path, output_dir: Path):
    """Process all LAPACK source files and generate markdown documentation."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all Fortran files
    fortran_files = list(src_dir.glob('*.f'))
    
    print(f"Found {len(fortran_files)} Fortran files")
    
    processed = 0
    for filepath in fortran_files:
        routine_info = parse_fortran_file(filepath)
        
        if routine_info:
            md_content = generate_markdown(routine_info)
            output_file = output_dir / f"{routine_info['name'].lower()}.md"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(md_content)
            
            processed += 1
            if processed % 100 == 0:
                print(f"Processed {processed} files...")
    
    print(f"\nSuccessfully processed {processed} routines")
    print(f"Generated markdown files in {output_dir}")

if __name__ == "__main__":
    base_dir = Path("/tmp/lapack-scraper/lapack")
    output_dir = Path("/home/runner/work/LAPACK-BLAS-Documentation-Search-Raycast/LAPACK-BLAS-Documentation-Search-Raycast/docs")
    
    # Process LAPACK routines
    lapack_src = base_dir / "SRC"
    if lapack_src.exists():
        print("Processing LAPACK routines...")
        process_lapack_sources(lapack_src, output_dir)
    else:
        print(f"Error: LAPACK source directory not found at {lapack_src}")
    
    # Process BLAS routines
    blas_src = base_dir / "BLAS" / "SRC"
    if blas_src.exists():
        print("\nProcessing BLAS routines...")
        process_lapack_sources(blas_src, output_dir)
    else:
        print(f"Warning: BLAS source directory not found at {blas_src}")
