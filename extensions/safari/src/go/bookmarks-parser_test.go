package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// TestBookmarksParser tests the bookmarks parser and generates snapshots
func TestBookmarksParser(t *testing.T) {
	// Set up test directory
	testDir := "testdata"
	snapshotDir := filepath.Join(testDir, "snapshots")

	// Ensure test directory exists
	if err := os.MkdirAll(snapshotDir, 0755); err != nil {
		t.Fatalf("Failed to create test directory: %v", err)
	}

	// Test cases
	testCases := []struct {
		name         string
		inputFile    string
		expectedFile string
	}{
		{
			name:         "Default bookmarks file",
			inputFile:    filepath.Join(testDir, "sample_bookmarks.plist"),
			expectedFile: filepath.Join(snapshotDir, "sample_bookmarks.json"),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Parse bookmarks file
			jsonData, err := processBookmarksFile(tc.inputFile)
			if err != nil {
				t.Fatalf("Failed to parse bookmarks file: %v", err)
			}

			// Check if snapshot file exists
			_, err = os.Stat(tc.expectedFile)
			if os.IsNotExist(err) {
				// If snapshot doesn't exist, create a new one
				t.Logf("Creating new snapshot file: %s", tc.expectedFile)
				if err := os.WriteFile(tc.expectedFile, jsonData, 0644); err != nil {
					t.Fatalf("Failed to create snapshot file: %v", err)
				}
				return
			} else if err != nil {
				t.Fatalf("Failed to check snapshot file: %v", err)
			}

			// Read snapshot file
			expectedData, err := os.ReadFile(tc.expectedFile)
			if err != nil {
				t.Fatalf("Failed to read snapshot file: %v", err)
			}

			// Compare output with snapshot
			if !compareJSON(t, expectedData, jsonData) {
				// Update snapshot if needed, controlled by environment variable
				if os.Getenv("UPDATE_SNAPSHOTS") == "true" {
					t.Logf("Updating snapshot file: %s", tc.expectedFile)
					if err := os.WriteFile(tc.expectedFile, jsonData, 0644); err != nil {
						t.Fatalf("Failed to update snapshot file: %v", err)
					}
				} else {
					t.Errorf("Output does not match snapshot, run 'UPDATE_SNAPSHOTS=true go test' to update snapshots")
				}
			}
		})
	}
}

// compareJSON compares if two JSON data are equal
func compareJSON(t *testing.T, expected, actual []byte) bool {
	var expectedObj, actualObj interface{}

	if err := json.Unmarshal(expected, &expectedObj); err != nil {
		t.Fatalf("Failed to parse expected JSON: %v", err)
	}

	if err := json.Unmarshal(actual, &actualObj); err != nil {
		t.Fatalf("Failed to parse actual JSON: %v", err)
	}

	// Re-serialize both objects into normalized JSON strings
	expectedJSON, err := json.Marshal(expectedObj)
	if err != nil {
		t.Fatalf("Failed to re-serialize expected JSON: %v", err)
	}

	actualJSON, err := json.Marshal(actualObj)
	if err != nil {
		t.Fatalf("Failed to re-serialize actual JSON: %v", err)
	}

	return string(expectedJSON) == string(actualJSON)
}
