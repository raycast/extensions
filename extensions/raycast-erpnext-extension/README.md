# 🚀 Raycast Frappe ERPNext Extension

A powerful [Raycast](https://raycast.com) extension that brings [Frappe](https://frappe.io) and [ERPNext](https://erpnext.com) functionality directly to your macOS desktop. Search, browse, and manage your ERPNext documents with lightning speed!

![Raycast ERPNext Extension](https://img.shields.io/badge/Raycast-Extension-FF6363?style=for-the-badge&logo=raycast)
![ERPNext](https://img.shields.io/badge/ERPNext-Supported-0089FF?style=for-the-badge)
![Frappe](https://img.shields.io/badge/Frappe-Framework-00D09C?style=for-the-badge)

## ✨ Features

- **🔍 Universal Search**: Instantly search across all your ERPNext documents
- **📋 DocType Browser**: Browse and explore all available document types
- **📊 Document Details**: View beautifully organized document information with metadata
- **🎨 Color-Coded Interface**: Intuitive color system for different business functions
- **⚡ Lightning Fast**: Native performance with Raycast's speed
- **🔗 Direct Integration**: Open documents directly in ERPNext with one click

## 🛠️ Installation

1. Install [Raycast](https://raycast.com) if you haven't already
2. Add this extension to your Raycast extensions
3. Configure your ERPNext connection in the extension preferences

## ⚙️ Configuration

Before using the extension, you'll need to configure your ERPNext connection:

1. Open Raycast preferences (`⌘ + ,`)
2. Navigate to Extensions → ERPNext
3. Set the following:
   - **ERPNext URL**: Your ERPNext instance URL (e.g., `https://your-company.erpnext.com`)
   - **API Key**: Your ERPNext API key
   - **API Secret**: Your ERPNext API secret

## 📖 Commands

### 🔍 Search ERPNext
**Keyword**: `erp` or `erpnext`

Instantly search across all your ERPNext documents. Simply type to find:
- Customers and Suppliers
- Sales and Purchase Orders
- Items and Inventory
- Employees and HR records
- Projects and Tasks
- And much more!

### 📋 Browse DocTypes
**Keyword**: `doctype`

Explore all available document types in your ERPNext instance:
- View all DocTypes organized by module
- See custom vs standard DocTypes
- Browse documents within each DocType
- Quick access to create new documents

## 🎨 Color System & Icons

Our intuitive color-coding system helps you instantly recognize different types of business documents:

### 💚 **Green - Financial & Accounting**
Documents related to money, payments, and financial transactions
- 💰 **Journal Entry** - Core financial transactions
- 💵 **Payment Entry** - Money in/out for Accounts Receivable/Payable  
- 📒 **GL Entry** - General ledger postings
- 🏦 **Bank Reconciliation** - Bank statement matching
- 👤 **Employee** - HR and payroll
- 💰 **Salary Slip** - Employee compensation

### 🔵 **Blue - Customer-Facing & CRM**
Documents related to customers, sales, and customer relationships
- 📄 **Sales Order** - Orders from customers
- 🧾 **Sales Invoice** - Bills to customers  
- 👤 **Customer** - Customer master data
- 💬 **Lead** - Prospective customers
- 🎯 **Opportunity** - Sales potential
- 📄 **Quotation** - Price quotes

### 🟣 **Purple - Supplier-Facing & Purchasing**
Documents related to suppliers, purchasing, and procurement
- 📄 **Purchase Order** - Orders to suppliers
- 🧾 **Purchase Invoice** - Bills from suppliers
- 🏢 **Supplier** - Supplier master data
- 📥 **Purchase Receipt** - Goods received
- ✓ **ToDo** - Task management

### 🟠 **Orange - Inventory & Manufacturing**
Documents related to stock, manufacturing, and operations
- 📦 **Delivery Note** - Dispatch to customers
- 🔄 **Stock Entry** - Internal stock movements
- 🔨 **Work Order** - Manufacturing operations
- 📋 **Bill of Materials** - Production components
- 📦 **Item** - Product catalog
- 🏢 **Warehouse** - Storage locations

### ⚪ **Gray - Support & Internal**
Documents for internal operations, support, and administration
- 🐛 **Issue** - Support tickets
- 🏷️ **Asset** - Fixed asset records
- 🔍 **Quality Inspection** - QC checks
- 👤 **Contact** - Contact information
- 📁 **Project** - Project management
- ✅ **Task** - Project tasks

### 🔴 **Red - System & Configuration**
System-level documents and configuration
- ⚙️ **DocType** - Document type definitions
- 👤 **User** - System users
- 🛡️ **Role** - User permissions
- 📄 **Print Format** - Document templates
- ➕ **Custom Field** - Field customizations

## 🚀 Usage Tips

### Quick Navigation
- Use `⌘ + K` to open Raycast
- Type `erp` to start searching ERPNext
- Type `doctype` to browse document types
- Use arrow keys to navigate results
- Press `⏎` to view document details
- Press `⌘ + ⏎` to open in ERPNext

### Search Best Practices
- **Be specific**: Search for document names, customer names, or item codes
- **Use partial matches**: Type part of a name to find matches
- **Browse by type**: Use DocType browser when you're exploring
- **Keyboard shortcuts**: Learn the shortcuts for faster navigation

### Document Details
When viewing document details, you'll see:
- **Organized sections**: Fields grouped as they appear in ERPNext
- **Metadata sidebar**: Important document information
- **Status indicators**: Visual cues for document status
- **Quick actions**: Copy, edit, or open in browser

## 🔧 Troubleshooting

### Connection Issues
- Verify your ERPNext URL is correct and accessible
- Check that your API Key and Secret are valid
- Ensure your ERPNext instance allows API access
- Test the connection in your ERPNext settings

### Search Not Working
- Confirm you have read permissions for the documents
- Check if Global Search is enabled in ERPNext
- Verify your user role has access to the modules

### Performance Tips
- Search results are cached for better performance
- Use specific search terms for faster results
- Clear cache if you're seeing outdated information

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Found an issue? Please create an issue with details
2. **Suggest Features**: Have ideas? We'd love to hear them
3. **Improve Documentation**: Help make this README even better
4. **Submit Pull Requests**: Code contributions are always welcome

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **[Raycast](https://raycast.com)** - For creating an amazing productivity platform
- **[Frappe](https://frappe.io)** - For the powerful framework that powers ERPNext
- **[ERPNext](https://erpnext.com)** - For the comprehensive ERP solution
- The open-source community for continuous inspiration and support

## 📞 Support

Need help? Here are your options:

- **Documentation**: Check this README first
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Community**: Join the Frappe/ERPNext community discussions
- **ERPNext Support**: For ERPNext-specific questions

---

**Made with ❤️ for the ERPNext community**

*Bringing the power of ERPNext to your fingertips through Raycast*