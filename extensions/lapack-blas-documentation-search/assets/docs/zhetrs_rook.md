```fortran
subroutine zhetrs_rook (
        character uplo,
        integer n,
        integer nrhs,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

ZHETRS_ROOK solves a system of linear equations A\*X = B with a complex
Hermitian matrix A using the factorization A = U\*D\*U\*\*H or
A = L\*D\*L\*\*H computed by ZHETRF_ROOK.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*H;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*H.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by ZHETRF_ROOK.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by ZHETRF_ROOK.

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
