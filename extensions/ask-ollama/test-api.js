// Test script to verify Ollama API
import { OllamaService } from './src/ollama-service.js';

async function testOllamaAPI() {
  try {
    console.log('Testing Ollama API...');
    const service = new OllamaService('http://localhost:11434');

    console.log('Testing connection...');
    const isConnected = await service.testConnection();
    console.log('Connection result:', isConnected);

    if (isConnected) {
      console.log('Fetching models...');
      const models = await service.getModels();
      console.log('Models found:', models.length);
      console.log('Model names:', models.map(m => m.name));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testOllamaAPI();