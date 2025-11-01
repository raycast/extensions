```fortran
subroutine chetrs_aa (
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CHETRS_AA solves a system of linear equations A\*X = B with a complex
hermitian matrix A using the factorization A = U\*\*H\*T\*U or
A = L\*T\*L\*\*H computed by CHETRF_AA.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*\*H\*T\*U;
> = 'L':  Lower triangular, form is A = L\*T\*L\*\*H.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> Details of factors computed by CHETRF_AA.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges as computed by CHETRF_AA.

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If MIN(N,NRHS) = 0, LWORK >= 1, else LWORK >= 3\*N-2.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the minimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
