```fortran
subroutine cpftrf (
        character transr,
        character uplo,
        integer n,
        complex, dimension( 0: * ) a,
        integer info
)
```

CPFTRF computes the Cholesky factorization of a complex Hermitian
positive definite matrix A.

The factorization has the form
A = U\*\*H \* U,  if UPLO = 'U', or
A = L  \* L\*\*H,  if UPLO = 'L',
where U is an upper triangular matrix and L is lower triangular.

This is the block version of the algorithm, calling Level 3 BLAS.

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  The Normal TRANSR of RFP A is stored;
> = 'C':  The Conjugate-transpose TRANSR of RFP A is stored.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of RFP A is stored;
> = 'L':  Lower triangle of RFP A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension ( N\*(N+1)/2 ); [in,out]
> On entry, the Hermitian matrix A in RFP format. RFP format is
> described by TRANSR, UPLO, and N as follows: If TRANSR = 'N'
> then RFP A is (0:N,0:k-1) when N is even; k=N/2. RFP A is
> (0:N-1,0:k) when N is odd; k=N/2. IF TRANSR = 'C' then RFP is
> the Conjugate-transpose of RFP A as defined when
> TRANSR = 'N'. The contents of RFP A are defined by UPLO as
> follows: If UPLO = 'U' the RFP A contains the nt elements of
> upper packed A. If UPLO = 'L' the RFP A contains the elements
> of lower packed A. The LDA of RFP A is (N+1)/2 when TRANSR =
> 'C'. When TRANSR is 'N' the LDA is N+1 when N is even and N
> is odd. See the Note below for more details.
> 
> On exit, if INFO = 0, the factor U or L from the Cholesky
> factorization RFP A = U\*\*H\*U or RFP A = L\*L\*\*H.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the leading principal minor of order i
> is not positive, and the factorization could not be
> completed.
> 
> Further Notes on RFP Format:
> ============================
> 
> We first consider Standard Packed Format when N is even.
> We give an example where N = 6.
> 
> AP is Upper             AP is Lower
> 
> 00 01 02 03 04 05       00
> 11 12 13 14 15       10 11
> 22 23 24 25       20 21 22
> 33 34 35       30 31 32 33
> 44 45       40 41 42 43 44
> 55       50 51 52 53 54 55
> 
> Let TRANSR = 'N'. RFP holds AP as follows:
> For UPLO = 'U' the upper trapezoid A(0:5,0:2) consists of the last
> three columns of AP upper. The lower triangle A(4:6,0:2) consists of
> conjugate-transpose of the first three columns of AP upper.
> For UPLO = 'L' the lower trapezoid A(1:6,0:2) consists of the first
> three columns of AP lower. The upper triangle A(0:2,0:2) consists of
> conjugate-transpose of the last three columns of AP lower.
> To denote conjugate we place -- above the element. This covers the
> case N even and TRANSR = 'N'.
> 
> RFP A                   RFP A
> 
> -- -- --
> 03 04 05                33 43 53
> -- --
> 13 14 15                00 44 54
> --
> 23 24 25                10 11 55
> 
> 33 34 35                20 21 22
> --
> 00 44 45                30 31 32
> -- --
> 01 11 55                40 41 42
> -- -- --
> 02 12 22                50 51 52
> 
> Now let TRANSR = 'C'. RFP A in both UPLO cases is just the conjugate-
> transpose of RFP A above. One therefore gets:
> 
> RFP A                   RFP A
> 
> -- -- -- --                -- -- -- -- -- --
> 03 13 23 33 00 01 02    33 00 10 20 30 40 50
> -- -- -- -- --                -- -- -- -- --
> 04 14 24 34 44 11 12    43 44 11 21 31 41 51
> -- -- -- -- -- --                -- -- -- --
> 05 15 25 35 45 55 22    53 54 55 22 32 42 52
> 
> We next  consider Standard Packed Format when N is odd.
> We give an example where N = 5.
> 
> AP is Upper                 AP is Lower
> 
> 00 01 02 03 04              00
> 11 12 13 14              10 11
> 22 23 24              20 21 22
> 33 34              30 31 32 33
> 44              40 41 42 43 44
> 
> Let TRANSR = 'N'. RFP holds AP as follows:
> For UPLO = 'U' the upper trapezoid A(0:4,0:2) consists of the last
> three columns of AP upper. The lower triangle A(3:4,0:1) consists of
> conjugate-transpose of the first two   columns of AP upper.
> For UPLO = 'L' the lower trapezoid A(0:4,0:2) consists of the first
> three columns of AP lower. The upper triangle A(0:1,1:2) consists of
> conjugate-transpose of the last two   columns of AP lower.
> To denote conjugate we place -- above the element. This covers the
> case N odd  and TRANSR = 'N'.
> 
> RFP A                   RFP A
> 
> -- --
> 02 03 04                00 33 43
> --
> 12 13 14                10 11 44
> 
> 22 23 24                20 21 22
> --
> 00 33 34                30 31 32
> -- --
> 01 11 44                40 41 42
> 
> Now let TRANSR = 'C'. RFP A in both UPLO cases is just the conjugate-
> transpose of RFP A above. One therefore gets:
> 
> RFP A                   RFP A
> 
> -- -- --                   -- -- -- -- -- --
> 02 12 22 00 01             00 10 20 30 40 50
> -- -- -- --                   -- -- -- -- --
> 03 13 23 33 11             33 11 21 31 41 51
> -- -- -- -- --                   -- -- -- --
> 04 14 24 34 44             43 44 22 32 42 52
