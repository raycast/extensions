// Jest setup file
import '@testing-library/jest-dom';

// Mock Raycast API functions that might not be available in test environment
(global as any).showHUD = jest.fn();
(global as any).showToast = jest.fn();
(global as any).showInFinder = jest.fn();
