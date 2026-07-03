/*
Copyright © 2026 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"strings"

	"github.com/spf13/cobra"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "choose",
	Short: "Choose items from stdin via raycast",
	Long: `Takes input from stdin, separates into items by \n and feeds to raycast. Choice is then piped to stdout:

For now its just that, no extra flags or anything`,
	RunE: func(cmd *cobra.Command, args []string) error {
		listener, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return err
		}
		addr := listener.Addr().String()
		defer listener.Close()

		stdin, err := io.ReadAll(cmd.InOrStdin())
		if len(stdin) <= 1 {
			return errors.New("Got empty stdin!")
		}
		if err != nil {
			return err
		}

		host, port, _ := net.SplitHostPort(addr)
		deepLinkURL := fmt.Sprintf(`raycast://extensions/anaritus/choose/choose?arguments={"host": "%s","port": "%s"}`, host, port)
		if err != nil {
			return err
		}
		exec.Command("open", deepLinkURL).Run()

		items := strings.Split(string(stdin), "\n")

		conn, err := listener.Accept()
		fmt.Fprintf(os.Stderr, "Listening on %v...", addr)
		fmt.Fprintf(conn, "%v\n", len(items))
		for _, item := range items {
			fmt.Fprintf(conn, "%v\n", item)
		}
		var choice string
		fmt.Fscan(bufio.NewReader(conn), &choice)

		fmt.Println(choice)
		return nil
	},
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
}
