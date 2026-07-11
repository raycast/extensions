import type { ListItem } from "../types";

export const EXAMPLE_SNIPPETS: ListItem[] = [
  {
    id: 1,
    name: "React Component",
    snippetName: "Custom Hook",
    detail: "React Component • typescript",
    description: "React",
    value: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}`,
    language: "typescript",
  },
  {
    id: 2,
    name: "API Endpoint",
    snippetName: "Express Route",
    detail: "API Endpoint • javascript",
    description: "Backend",
    value: `app.post('/api/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});`,
    language: "javascript",
  },
  {
    id: 3,
    name: "SQL Query",
    snippetName: "Database Query",
    detail: "SQL Query • sql",
    description: "Database",
    value: `SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.active = true
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC;`,
    language: "sql",
  },
  {
    id: 4,
    name: "Tailwind Config",
    snippetName: "Config File",
    detail: "Tailwind Config • javascript",
    description: "Configuration",
    value: `module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
      },
    },
  },
  plugins: [],
}`,
    language: "javascript",
  },
  {
    id: 5,
    name: "Python Script",
    snippetName: "Data Processing",
    detail: "Python Script • python",
    description: "Scripts",
    value: `import pandas as pd
from datetime import datetime

def process_data(file_path):
    df = pd.read_csv(file_path)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    return df.groupby('category').sum()

result = process_data('data.csv')
print(result)`,
    language: "python",
  },
];
