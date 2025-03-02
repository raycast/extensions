package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// TestBookmarksParser 测试书签解析器并生成快照
func TestBookmarksParser(t *testing.T) {
	// 设置测试目录
	testDir := "testdata"
	snapshotDir := filepath.Join(testDir, "snapshots")

	// 确保测试目录存在
	if err := os.MkdirAll(snapshotDir, 0755); err != nil {
		t.Fatalf("无法创建测试目录: %v", err)
	}

	// 测试用例
	testCases := []struct {
		name         string
		inputFile    string
		expectedFile string
	}{
		{
			name:         "默认书签文件",
			inputFile:    filepath.Join(testDir, "sample_bookmarks.plist"),
			expectedFile: filepath.Join(snapshotDir, "sample_bookmarks.json"),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 解析书签文件
			jsonData, err := processBookmarksFile(tc.inputFile)
			if err != nil {
				t.Fatalf("解析书签文件失败: %v", err)
			}

			// 检查快照文件是否存在
			_, err = os.Stat(tc.expectedFile)
			if os.IsNotExist(err) {
				// 如果快照不存在，创建一个新的快照
				t.Logf("创建新的快照文件: %s", tc.expectedFile)
				if err := os.WriteFile(tc.expectedFile, jsonData, 0644); err != nil {
					t.Fatalf("创建快照文件失败: %v", err)
				}
				return
			} else if err != nil {
				t.Fatalf("检查快照文件失败: %v", err)
			}

			// 读取快照文件
			expectedData, err := os.ReadFile(tc.expectedFile)
			if err != nil {
				t.Fatalf("读取快照文件失败: %v", err)
			}

			// 比较输出与快照
			if !compareJSON(t, expectedData, jsonData) {
				// 如果需要更新快照，可以通过环境变量控制
				if os.Getenv("UPDATE_SNAPSHOTS") == "true" {
					t.Logf("更新快照文件: %s", tc.expectedFile)
					if err := os.WriteFile(tc.expectedFile, jsonData, 0644); err != nil {
						t.Fatalf("更新快照文件失败: %v", err)
					}
				} else {
					t.Errorf("输出与快照不匹配，运行 'UPDATE_SNAPSHOTS=true go test' 更新快照")
				}
			}
		})
	}
}

// compareJSON 比较两个 JSON 数据是否相等
func compareJSON(t *testing.T, expected, actual []byte) bool {
	var expectedObj, actualObj interface{}

	if err := json.Unmarshal(expected, &expectedObj); err != nil {
		t.Fatalf("解析预期 JSON 失败: %v", err)
	}

	if err := json.Unmarshal(actual, &actualObj); err != nil {
		t.Fatalf("解析实际 JSON 失败: %v", err)
	}

	// 将两个对象重新序列化为规范化的 JSON 字符串
	expectedJSON, err := json.Marshal(expectedObj)
	if err != nil {
		t.Fatalf("重新序列化预期 JSON 失败: %v", err)
	}

	actualJSON, err := json.Marshal(actualObj)
	if err != nil {
		t.Fatalf("重新序列化实际 JSON 失败: %v", err)
	}

	return string(expectedJSON) == string(actualJSON)
}
