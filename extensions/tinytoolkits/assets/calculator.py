#!/usr/bin/env python3
"""
Calculator script for Raycast extension
Evaluates mathematical expressions and returns results in multiple formats
"""

import sys
import json


def calculate(expression):
    """
    Calculate expression and return results in multiple formats
    
    Args:
        expression: Mathematical expression to evaluate
        
    Returns:
        dict: Results containing original, hex, and int values
    """
    try:
        # Evaluate the expression
        result = eval(expression)
        
        # Prepare the response
        response = {
            "success": True,
            "original": str(result),
            "hex": "N/A",
            "int": "N/A",
            "error": None
        }
        
        # Try to convert to number
        try:
            num_value = float(result)
            
            # Calculate integer value
            int_value = int(num_value)
            response["int"] = str(int_value)
            
            # Calculate hex value
            try:
                if int_value >= 0 and int_value <= sys.maxsize:
                    response["hex"] = "0x" + format(int_value, 'X')
                elif int_value < 0:
                    response["hex"] = "-0x" + format(abs(int_value), 'X')
                else:
                    response["hex"] = "Number too large"
                    response["error"] = "Number too large for hex conversion"
            except (ValueError, OverflowError) as e:
                response["hex"] = "Error"
                response["error"] = f"Hex conversion error: {str(e)}"
                
        except (ValueError, TypeError):
            # Not a numeric result
            response["int"] = "Not a number"
            response["hex"] = "Not a number"
            response["error"] = "Result is not numeric"
            
        return response
        
    except Exception as e:
        return {
            "success": False,
            "original": "Error",
            "hex": "Error",
            "int": "Error",
            "error": str(e)
        }


def main():
    """Main function to handle command line input"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No expression provided"
        }))
        sys.exit(1)
    
    expression = sys.argv[1]
    result = calculate(expression)
    
    # Output as JSON
    print(json.dumps(result))
    
    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()