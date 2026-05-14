```fortran
subroutine dsytrf_aa (
        character uplo,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DSYTRF_AA computes the factorization of a real symmetric matrix A
using the Aasen's algorithm.  The form of the factorization is

A = U\*\*T\*T\*U  or  A = L\*T\*L\*\*T

where U (or L) is a product of permutation and unit upper (lower)
triangular matrices, and T is a symmetric tridiagonal matrix.

This is the blocked version of the algorithm, calling Level 3 BLAS.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> N-by-N upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> 
> On exit, the tridiagonal matrix is stored in the diagonals
> and the subdiagonals of A just below (or above) the diagonals,
> and L is stored below (or above) the subdiagonals, when UPLO
> is 'L' (or 'U').

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [out]
> On exit, it contains the details of the interchanges, i.e.,
> the row and column k of A were interchanged with the
> row and column IPIV(k).

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of WORK.
> LWORK >= 1, if N <= 1, and LWORK >= 2\*N, otherwise.
> For optimum performance LWORK >= N\*(1+NB), where NB is
> the optimal blocksize, returned by ILAENV.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
