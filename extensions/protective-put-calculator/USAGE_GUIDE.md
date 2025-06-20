# 🚀 Production Usage Guide

## How to Use the Protective Put Calculator

### 🎯 Quick Start
The extension now accepts user input through Raycast arguments. When you trigger the command, you'll be prompted to enter:

1. **Stock Ticker** (required): e.g., AAPL, MSFT, TSLA
2. **Stop Loss Price** (required): e.g., 150.00
3. **Maximum Loss** (optional): e.g., 500 (defaults to $500)

### 📝 Usage Examples

#### Example 1: Basic Usage
```
Command: Calculate Protective Put
Ticker: AAPL
Stop Loss: 180
Max Loss: 500
```

#### Example 2: With Custom Max Loss
```
Command: Calculate Protective Put  
Ticker: MSFT
Stop Loss: 300
Max Loss: 1000
```

#### Example 3: Conservative Play
```
Command: Calculate Protective Put
Ticker: TSLA  
Stop Loss: 200
Max Loss: 250
```

### ⚙️ Preferences
You can set default values in Raycast preferences:
- **Default Maximum Loss**: Your preferred default loss limit
- **Default Holding Period**: 1w, 2w, or 1m

### 📊 Results
The extension provides rich visual results in a professional Detail view:

#### 🎯 Interactive Detail View
- **Rich Markdown Display**: Professional formatted results with sections and visual styling
- **Position Summary**: Stock ticker, shares count, put contracts, stop loss price
- **Cost Breakdown**: Stock cost, option premium, total investment required
- **Risk Analysis**: Maximum loss, target loss, breakeven price, protection percentage
- **Strategy Notes**: Educational content and key benefits
- **Action Panel**: Quick actions for copying and learning

#### 🎮 Available Actions
- **Copy Strategy Summary** (⌘C): Quick one-liner for sharing
- **Copy Detailed Results** (⌘⇧C): Full markdown analysis for documentation
- **Learn About Protective Puts** (⌘L): Educational Investopedia link

#### 🔄 Real-time Feedback  
- **Loading States**: Professional loading indicator during calculations
- **Error Handling**: Clear error messages with usage instructions
- **Toast Notifications**: Progress updates and quick summaries

### 🛡️ Safety Features
- **Input Validation**: Ensures valid tickers and prices
- **Loss Limits**: Maximum $10,000 loss cap for safety
- **Error Handling**: Clear error messages for invalid inputs
- **Risk Warnings**: Educational disclaimers included

### 💡 Pro Tips
1. **Check Console**: Detailed results are logged for analysis
2. **Use Preferences**: Set your preferred defaults to speed up usage
3. **Validate Inputs**: Ensure ticker symbols are correct (1-5 letters)
4. **Consider Risk**: Max loss should be money you can afford to lose

### 🔄 Workflow
1. **Open Raycast** → Search "Calculate Protective Put"
2. **Enter Inputs** → Ticker, Stop Loss, Max Loss (optional)
3. **Execute** → Extension calculates strategy
4. **Review Results** → Check toast notifications and console output
5. **Analyze** → Use detailed breakdown for decision making

### ⚠️ Important Notes
- This tool is for **educational purposes only**
- Always **consult a financial advisor** before trading
- Options trading involves **significant risk**
- Results are based on **theoretical calculations**

The extension is now production-ready and can handle real user inputs through Raycast's native argument system!
