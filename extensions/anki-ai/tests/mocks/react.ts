// tests/mocks/react.ts
import React from 'react';

// Mock dos hooks do React
export const useState = jest.fn().mockImplementation((initialValue) => {
  let value = initialValue;
  const setValue = jest.fn((newValue) => {
    value = typeof newValue === 'function' ? newValue(value) : newValue;
  });
  return [value, setValue];
});

export const useEffect = jest.fn().mockImplementation((fn) => fn());
export const useCallback = jest.fn().mockImplementation((fn) => fn);
export const useRef = jest.fn().mockImplementation((initialValue) => ({ current: initialValue }));

// Mock do React
const ReactMock = {
  ...React,
  useState,
  useEffect,
  useCallback,
  useRef,
};

export default ReactMock;
