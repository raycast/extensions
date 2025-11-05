```fortran
subroutine dgetrs (
        character trans,
        integer n,
        integer nrhs,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

DGETRS solves a system of linear equations
A \* X = B  or  A\*\*T \* X = B
with a general N-by-N matrix A using the LU factorization computed
by DGETRF.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B  (No transpose)
> = 'T':  A\*\*T\* X = B  (Transpose)
> = 'C':  A\*\*T\* X = B  (Conjugate transpose = Transpose)

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> The factors L and U from the factorization A = P\*L\*U
> as computed by DGETRF.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from DGETRF; for 1<=i<=N, row i of the
> matrix was interchanged with row IPIV(i).

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
