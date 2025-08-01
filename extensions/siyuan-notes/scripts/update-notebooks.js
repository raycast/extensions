#!/usr/bin/env node

/**
 * 更新 package.json 中的笔记本下拉列表数据
 * 从 SiYuan API 获取笔记本列表并更新到配置中
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function getNotebooks() {
  try {
    // 读取环境变量或默认设置
    const siyuanUrl = process.env.SIYUAN_URL || 'http://127.0.0.1:6806';
    const apiToken = process.env.SIYUAN_API_TOKEN;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Token ${apiToken}`;
    }
    
    const response = await axios.post(
      `${siyuanUrl}/api/notebook/lsNotebooks`,
      {},
      { headers }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`API 错误: ${response.data.msg}`);
    }
    
    return response.data.data.notebooks || [];
  } catch (error) {
    console.error('获取笔记本列表失败:', error.message);
    return [];
  }
}

async function updatePackageJson() {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 获取笔记本列表
    const notebooks = await getNotebooks();
    
    // 构建下拉列表数据
    const notebookData = [
      { title: "全部笔记本", value: "all" },
      ...notebooks.map(notebook => ({
        title: notebook.name,
        value: notebook.id
      }))
    ];
    
    // 找到 search-notes 命令并更新笔记本参数
    const searchNotesCommand = packageJson.commands.find(cmd => cmd.name === 'search-notes');
    if (searchNotesCommand && searchNotesCommand.arguments) {
      const notebookArg = searchNotesCommand.arguments.find(arg => arg.name === 'notebook');
      if (notebookArg) {
        notebookArg.data = notebookData;
      }
    }
    
    // 写回文件
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ 已更新 package.json，添加了 ${notebooks.length} 个笔记本选项`);
    notebooks.forEach(notebook => {
      console.log(`   - ${notebook.name} (${notebook.id})`);
    });
    
  } catch (error) {
    console.error('更新 package.json 失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updatePackageJson();
}

module.exports = { updatePackageJson, getNotebooks };