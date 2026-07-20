```fortran
subroutine chetrs_aa_2stage (
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) tb,
        integer ltb,
        integer, dimension( * ) ipiv,
        integer, dimension( * ) ipiv2,
        complex, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

CHETRS_AA_2STAGE solves a system of linear equations A\*X = B with a real
hermitian matrix A using the factorization A = U\*\*T\*T\*U or
A = L\*T\*L\*\*T computed by CHETRF_AA_2STAGE.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*\*T\*T\*U;
> = 'L':  Lower triangular, form is A = L\*T\*L\*\*T.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> Details of factors computed by CHETRF_AA_2STAGE.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

TB : COMPLEX array, dimension (LTB) [out]
> Details of factors computed by CHETRF_AA_2STAGE.

LTB : INTEGER [in]
> The size of the array TB. LTB >= 4\*N.

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges as computed by
> CHETRF_AA_2STAGE.

IPIV2 : INTEGER array, dimension (N) [in]
> Details of the interchanges as computed by
> CHETRF_AA_2STAGE.

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
