#!/usr/bin/env python3
"""
File Organizer - Simple file organization script for Raycast extension
Organizes files into categorized folders based on file extensions
"""
import os
import sys
import json
import shutil

# File types to ignore when sorting
FILES_TO_IGNORE = []

# System files to ignore (these should never be moved)
SYSTEM_FILES_TO_IGNORE = ['.DS_Store', 'Thumbs.db', 'desktop.ini']

# Default file type categories
DEFAULT_FILE_TYPES = {
    "★ Pictures": [
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".heic", ".svg", ".ico"
    ],
    "★ Videos": [
        ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mpeg", ".3gp", ".ts"
    ],
    "★ Audio": [
        ".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma", ".aiff"
    ],
    "★ Documents": [
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".odt", ".ods", ".odp", ".rtf", ".txt", ".md", ".csv", ".tsv", ".numbers",
        ".psd", ".ai", ".xd", ".fig", ".sketch", ".indd"
    ],
    "★ Archives": [
        ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso", ".dmg"
    ],
    "★ Code": [
        ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".c", ".cpp", ".h", ".hpp",
        ".cs", ".go", ".rb", ".php", ".swift", ".rs", ".sh", ".bat", ".sql", ".json", ".xml", ".yaml", ".yml"
    ],
    "★ Executables": [
        ".exe", ".msi", ".apk", ".app", ".bin", ".run", ".pkg", ".deb", ".rpm"
    ],
    "★ Fonts": [
        ".ttf", ".otf", ".woff", ".woff2", ".eot"
    ],
    "★ Other": []
}

def get_files_to_organize(folder_path):
    """Get list of files that can be organized"""
    try:
        all_files = os.listdir(folder_path)
        files_to_organize = []
        
        for file in all_files:
            file_path = os.path.join(folder_path, file)
            
            # Skip directories
            if os.path.isdir(file_path):
                continue
                
            # Skip system files
            if file in SYSTEM_FILES_TO_IGNORE:
                continue
                
            # Skip files in ignore list
            file_ext = os.path.splitext(file)[1]
            if file_ext and file_ext.lower() in [ext.lower() for ext in FILES_TO_IGNORE]:
                continue
                
            files_to_organize.append(file)
            
        return files_to_organize
    except Exception as e:
        return []

def categorize_files(files, file_types):
    """Categorize files based on their extensions"""
    categories = {}
    
    for file in files:
        file_ext = os.path.splitext(file)[1].lower()
        category_found = False
        
        # Find matching category
        for category, extensions in file_types.items():
            if category == "★ Other":
                continue
            if file_ext in [ext.lower() for ext in extensions]:
                if category not in categories:
                    categories[category] = []
                categories[category].append(file)
                category_found = True
                break
        
        # If no category found, put in "Other"
        if not category_found:
            if "★ Other" not in categories:
                categories["★ Other"] = []
            categories["★ Other"].append(file)
    
    return categories

def analyze_folder(folder_path, file_types):
    """Analyze what would be organized without moving files"""
    files = get_files_to_organize(folder_path)
    categories = categorize_files(files, file_types)
    
    # Convert file lists to counts for analysis
    category_counts = {}
    for category, file_list in categories.items():
        category_counts[category] = len(file_list)
    
    return {
        "total_files": len(files),
        "categories": category_counts,
        "success": True
    }

def organize_folder(folder_path, file_types):
    """Actually organize files into folders"""
    try:
        files = get_files_to_organize(folder_path)
        
        if not files:
            return {
                "total_files": 0,
                "total_moved": 0,
                "categories": {},
                "categories_created": [],
                "success": True
            }
        
        categories = categorize_files(files, file_types)
        created_folders = []
        moved_files = []
        total_moved = 0
        
        # Create folders and move files
        for category, files_in_category in categories.items():
            if not files_in_category:
                continue
                
            # Create category folder
            category_path = os.path.join(folder_path, category)
            if not os.path.exists(category_path):
                os.makedirs(category_path)
                created_folders.append(category)
            
            # Move files to category folder
            for file in files_in_category:
                src_path = os.path.join(folder_path, file)
                dst_path = os.path.join(category_path, file)
                
                # Handle name conflicts
                counter = 1
                original_dst = dst_path
                while os.path.exists(dst_path):
                    name, ext = os.path.splitext(original_dst)
                    dst_path = f"{name}_{counter}{ext}"
                    counter += 1
                
                # Move the file
                shutil.move(src_path, dst_path)
                moved_files.append(file)
                total_moved += 1
        
        return {
            "total_files": len(files),
            "total_moved": total_moved,
            "categories": categories,
            "categories_created": created_folders,
            "moved_files": moved_files,
            "success": True
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "total_files": 0,
            "total_moved": 0,
            "categories": {},
            "categories_created": []
        }

def main():
    """Main function - handles command line arguments"""
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python3 file_organizer.py <folder_path> <file_types_json> [mode]"
        }))
        sys.exit(1)
    
    try:
        folder_path = sys.argv[1]
        file_types_json = sys.argv[2]
        mode = sys.argv[3] if len(sys.argv) > 3 else "organize"
        
        # Validate folder
        if not os.path.exists(folder_path):
            print(json.dumps({
                "success": False,
                "error": f"Folder does not exist: {folder_path}"
            }))
            sys.exit(1)
        
        if not os.path.isdir(folder_path):
            print(json.dumps({
                "success": False,
                "error": f"Path is not a directory: {folder_path}"
            }))
            sys.exit(1)
        
        # Parse file types
        try:
            file_types = json.loads(file_types_json)
        except json.JSONDecodeError:
            # Fallback to default if JSON is invalid
            file_types = DEFAULT_FILE_TYPES
        
        # Run organization or analysis
        if mode == "analyze":
            result = analyze_folder(folder_path, file_types)
        else:
            result = organize_folder(folder_path, file_types)
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "total_files": 0,
            "total_moved": 0,
            "categories": {},
            "categories_created": []
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()