# Mock Data Generator for Raycast

> Generate production-ready mock data for Java and Python instantly with customizable fields and templates.

![Extension Demo](metadata/generate-mock-data-demo.gif)

## ✨ Features

### 🎯 Multi-Language Support
- **Java**
  - POJO Classes with getters/setters
  - Records (Java 14+)
  - Builder Pattern
- **Python**
  - Dictionaries with mock values
  - Dataclasses
  - Pydantic Models

### 🔧 Flexible Field Management
- Add/remove fields dynamically
- Support for 5 data types: `String`, `Integer`, `Boolean`, `Date`, `Array`
- Unlimited field count for complex objects
- Real-time field editing

### 📋 Quick Start Templates
- **User Template**: id, username, email, isActive
- **Product Template**: id, name, price, inStock
- **Blog Template**: id, title, content, publishedDate, tags
- Load any template instantly with keyboard shortcuts

### ⚡ Developer-Friendly Workflow
- Live code preview with syntax highlighting
- One-click copy to clipboard
- Paste directly into your editor
- Cross-platform keyboard shortcuts (Mac & Windows)
- Clean, properly formatted code generation

## 🚀 Installation

Install from the [Raycast Store](https://raycast.com/kiing-dom/mock-data-generator) or:

1. Open Raycast
2. Search for "Mock Data Generator"
3. Click Install

## 📖 Usage

### Basic Workflow

1. **Open the extension** - Search for "Generate Mock Data" in Raycast
2. **Select language** - Choose between Java or Python
3. **Choose output format** - Select POJO, Record, Builder, Dict, Dataclass, or Pydantic
4. **Name your class** - Enter a name like "User", "Product", etc.
5. **Add fields** - Customize field names and types
6. **Generate** - Press `Cmd+G` (Mac) or `Ctrl+G` (Windows)
7. **Copy & paste** - Use `Cmd+C` to copy the generated code

### Screenshots

| Form View | Generated Code |
|-----------|----------------|
| ![Initial Form](metadata/initial-form.png) | ![Generated Code](metadata/mock-data-example.png) |

![Language Selection](metadata/form-language-select.png)

![Field Management](metadata/form%20fields.png)

### Keyboard Shortcuts

#### Form View
| Action | Mac | Windows |
|--------|-----|---------|
| Generate & Preview | `Cmd+G` | `Ctrl+G` |
| Add Field | `Cmd+N` | `Ctrl+N` |
| Remove Last Field | `Cmd+Backspace` | `Ctrl+Backspace` |
| Load User Template | `Cmd+Shift+U` | `Ctrl+Shift+U` |
| Load Product Template | `Cmd+Shift+P` | `Ctrl+Shift+P` |
| Load Blog Template | `Cmd+Shift+B` | `Ctrl+Shift+B` |

#### Preview View
| Action | Mac | Windows |
|--------|-----|---------|
| Copy to Clipboard | `Cmd+C` | `Ctrl+C` |
| Paste to Editor | `Cmd+V` | `Ctrl+V` |
| Back to Form | `Cmd+B` | `Ctrl+B` |

## 💡 Examples

### Java POJO Class
```java
public class User {
    private Integer id;
    private String username;
    private String email;
    private Boolean isActive;

    public User() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    // ... more getters/setters
}
```

### Java Record
```java
public record User(Integer id, String username, String email, Boolean isActive) {}
```

### Java Builder Pattern
```java
public class User {
    private Integer id;
    private String username;

    private User(Integer id, String username) {
        this.id = id;
        this.username = username;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Integer id;
        private String username;

        public Builder id(Integer id) {
            this.id = id;
            return this;
        }

        public Builder username(String username) {
            this.username = username;
            return this;
        }

        public User build() {
            return new User(id, username);
        }
    }
}
```

### Python Dictionary
```python
mock_data = {
    "id": 0,
    "username": "example_string",
    "email": "example_string",
    "isActive": True
}
```

### Python Dataclass
```python
from dataclasses import dataclass

@dataclass
class User:
    id: int
    username: str
    email: str
    isActive: bool
```

### Python Pydantic Model
```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    username: str
    email: str
    isActive: bool
```

## 🎨 Supported Data Types

| Type | Java | Python |
|------|------|--------|
| String | `String` | `str` |
| Integer | `Integer` | `int` |
| Boolean | `Boolean` | `bool` |
| Date | `LocalDate` | `date` |
| Array | `List<String>` | `List[str]` |

## 🛠️ Development

Want to contribute or run locally?

```bash
# Clone the repository
git clone https://github.com/kiing-dom/mock-data-raycast.git
cd mock-data-raycast

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

Ideas for future features:
- More languages (TypeScript, Go, C#, Rust)
- Test framework support (JUnit, pytest, Jest)
- Mock value generation (realistic fake data)
- Export to file
- Import from JSON schema

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👤 Author

**kiing-dom**
- GitHub: [@kiing-dom](https://github.com/kiing-dom)
- X/Twitter: [@_dngi](https://x.com/_dngi)

## ⭐ Support

If you find this extension helpful, please consider:
- Giving it a star on [GitHub](https://github.com/kiing-dom/mock-data-raycast)
- Sharing it with other developers
- Leaving a review on the Raycast Store

---

Made with ❤️ for developers who need mock data fast!