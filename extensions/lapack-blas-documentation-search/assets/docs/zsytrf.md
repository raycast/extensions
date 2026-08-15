```fortran
subroutine zsytrf (
        character uplo,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex*16, dimension( * ) work,
        integer lwork,
        integer info
)
```

ZSYTRF computes the factorization of a complex symmetric matrix A
using the Bunch-Kaufman diagonal pivoting method.  The form of the
factorization is

A = U\*D\*U\*\*T  or  A = L\*D\*L\*\*T

where U (or L) is a product of permutation and unit upper (lower)
triangular matrices, and D is symmetric and block diagonal with
1-by-1 and 2-by-2 diagonal blocks.

This is the blocked version of the algorithm, calling Level 3 BLAS.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> N-by-N upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> 
> On exit, the block diagonal matrix D and the multipliers used
> to obtain the factor U or L (see below for further details).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [out]
> Details of the interchanges and the block structure of D.
> If IPIV(k) > 0, then rows and columns k and IPIV(k) were
> interchanged and D(k,k) is a 1-by-1 diagonal block.
> If UPLO = 'U' and IPIV(k) = IPIV(k-1) < 0, then rows and
> columns k-1 and -IPIV(k) were interchanged and D(k-1:k,k-1:k)
> is a 2-by-2 diagonal block.  If UPLO = 'L' and IPIV(k) =
> IPIV(k+1) < 0, then rows and columns k+1 and -IPIV(k) were
> interchanged and D(k:k+1,k:k+1) is a 2-by-2 diagonal block.

WORK : COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of WORK.  LWORK >=1.  For best performance
> LWORK >= N\*NB, where NB is the block size returned by ILAENV.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, D(i,i) is exactly zero.  The factorization
> has been completed, but the block diagonal matrix D is
> exactly singular, and division by zero will occur if it
> is used to solve a system of equations.
