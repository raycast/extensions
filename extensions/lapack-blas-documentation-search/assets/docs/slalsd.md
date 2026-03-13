```fortran
subroutine slalsd (
        character uplo,
        integer smlsiz,
        integer n,
        integer nrhs,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real, dimension( ldb, * ) b,
        integer ldb,
        real rcond,
        integer rank,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

SLALSD uses the singular value decomposition of A to solve the least
squares problem of finding X to minimize the Euclidean norm of each
column of A\*X-B, where A is N-by-N upper bidiagonal, and X and B
are N-by-NRHS. The solution X overwrites B.

The singular values of A smaller than RCOND times the largest
singular value are treated as zero in solving the least squares
problem; in this case a minimum norm solution is returned.
The actual singular values are returned in D in ascending order.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U': D and E define an upper bidiagonal matrix.
> = 'L': D and E define a  lower bidiagonal matrix.

SMLSIZ : INTEGER [in]
> The maximum size of the subproblems at the bottom of the
> computation tree.

N : INTEGER [in]
> The dimension of the  bidiagonal matrix.  N >= 0.

NRHS : INTEGER [in]
> The number of columns of B. NRHS must be at least 1.

D : REAL array, dimension (N) [in,out]
> On entry D contains the main diagonal of the bidiagonal
> matrix. On exit, if INFO = 0, D contains its singular values.

E : REAL array, dimension (N-1) [in,out]
> Contains the super-diagonal entries of the bidiagonal matrix.
> On exit, E has been destroyed.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On input, B contains the right hand sides of the least
> squares problem. On output, B contains the solution X.

LDB : INTEGER [in]
> The leading dimension of B in the calling subprogram.
> LDB must be at least max(1,N).

RCOND : REAL [in]
> The singular values of A less than or equal to RCOND times
> the largest singular value are treated as zero in solving
> the least squares problem. If RCOND is negative,
> machine precision is used instead.
> For example, if diag(S)\*X=B were the least squares problem,
> where diag(S) is a diagonal matrix of singular values, the
> solution would be X(i) = B(i) / S(i) if S(i) is greater than
> RCOND\*max(S), and X(i) = 0 if S(i) is less than or equal to
> RCOND\*max(S).

RANK : INTEGER [out]
> The number of singular values of A greater than RCOND times
> the largest singular value.

WORK : REAL array, dimension at least [out]
> (9\*N + 2\*N\*SMLSIZ + 8\*N\*NLVL + N\*NRHS + (SMLSIZ+1)\*\*2),
> where NLVL = max(0, INT(log_2 (N/(SMLSIZ+1))) + 1).

IWORK : INTEGER array, dimension at least [out]
> (3\*N\*NLVL + 11\*N)

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  The algorithm failed to compute a singular value while
> working on the submatrix lying in rows and columns
> INFO/(N+1) through MOD(INFO,N+1).
