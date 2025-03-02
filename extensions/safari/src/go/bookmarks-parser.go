package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"

	"howett.net/plist"
)

// BookmarkNode represents a node in the Safari bookmarks tree
type BookmarkNode struct {
	Title           string                 `plist:"Title,omitempty" json:"title,omitempty"`
	URLString       string                 `plist:"URLString,omitempty" json:"url,omitempty"`
	WebBookmarkType string                 `plist:"WebBookmarkType,omitempty" json:"-"`
	Children        []BookmarkNode         `plist:"Children,omitempty" json:"children,omitempty"`
	URIDictionary   map[string]interface{} `plist:"URIDictionary,omitempty" json:"-"`
}

// BookmarkPListResult represents the structure that matches the TypeScript interface
type BookmarkPListResult struct {
	Title    string     `plist:"Title" json:"Title"`
	Children []Bookmark `plist:"Children" json:"Children"`
}

// Bookmark represents a Safari bookmark matching the TypeScript interface
type Bookmark struct {
	URIDictionary struct {
		Title string `plist:"title" json:"title"`
	} `plist:"URIDictionary" json:"URIDictionary"`
	ReadingListNonSync struct {
		Title string `plist:"Title,omitempty" json:"Title,omitempty"`
	} `plist:"ReadingListNonSync" json:"ReadingListNonSync"`
	WebBookmarkUUID string `plist:"WebBookmarkUUID" json:"WebBookmarkUUID"`
	WebBookmarkType string `plist:"WebBookmarkType" json:"WebBookmarkType"`
	URLString       string `plist:"URLString" json:"URLString"`
	ReadingList     struct {
		DateAdded      string `plist:"DateAdded" json:"DateAdded"`
		DateLastViewed string `plist:"DateLastViewed,omitempty" json:"DateLastViewed,omitempty"`
		PreviewText    string `plist:"PreviewText" json:"PreviewText"`
	} `plist:"ReadingList" json:"ReadingList"`
	ImageURL string     `plist:"imageURL" json:"imageURL"`
	Title    string     `plist:"Title" json:"Title"`
	Children []Bookmark `plist:"Children,omitempty" json:"Children,omitempty"`
}

func main() {
	// Define command line flags
	var bookmarksPath string
	var outputPath string
	var useStdin bool

	flag.StringVar(&bookmarksPath, "input", "", "Path to Safari's Bookmarks.plist file")
	flag.StringVar(&outputPath, "output", "", "Path to output JSON file (if empty, prints to stdout)")
	flag.BoolVar(&useStdin, "stdin", false, "Read plist data from stdin instead of file")
	flag.Parse()

	var jsonData []byte
	var err error

	// Process bookmarks from stdin or file
	if useStdin {
		jsonData, err = processBookmarksFromStdin()
	} else {
		jsonData, err = processBookmarksFile(bookmarksPath)
	}

	if err != nil {
		log.Fatal(err)
	}

	// Write to output file or print to stdout
	if outputPath != "" {
		err = os.WriteFile(outputPath, jsonData, 0644)
		if err != nil {
			log.Fatalf("error writing JSON file: %v", err)
		}
		fmt.Printf("Successfully converted Safari bookmarks to JSON: %s\n", outputPath)
	} else {
		// Print directly to stdout
		os.Stdout.Write(jsonData)
	}
}

func processBookmarksFromStdin() ([]byte, error) {
	// Read all data from stdin
	data, err := io.ReadAll(os.Stdin)
	if err != nil {
		return nil, fmt.Errorf("error reading from stdin: %v", err)
	}

	return processBookmarksData(data)
}

func processBookmarksFile(bookmarksPath string) ([]byte, error) {
	// Read the plist file
	data, err := os.ReadFile(bookmarksPath)
	if err != nil {
		return nil, fmt.Errorf("error reading bookmarks file: %v", err)
	}

	return processBookmarksData(data)
}

func processBookmarksData(data []byte) ([]byte, error) {
	// Parse the plist data
	var bookmarks map[string]interface{}
	_, err := plist.Unmarshal(data, &bookmarks)
	if err != nil {
		return nil, fmt.Errorf("error parsing plist data: %v", err)
	}

	// Convert to JSON - use a more efficient encoder
	buffer := &bytes.Buffer{}
	encoder := json.NewEncoder(buffer)
	encoder.SetIndent("", "  ")

	if err := encoder.Encode(bookmarks); err != nil {
		return nil, fmt.Errorf("error converting to JSON: %v", err)
	}

	return buffer.Bytes(), nil
}
