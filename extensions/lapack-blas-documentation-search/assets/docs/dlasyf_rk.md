```fortran
subroutine dlasyf_rk (
        character uplo,
        integer n,
        integer nb,
        integer kb,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) e,
        integer, dimension( * ) ipiv,
        double precision, dimension( ldw, * ) w,
        integer ldw,
        integer info
)
```

DLASYF_RK computes a partial factorization of a real symmetric
matrix A using the bounded Bunch-Kaufman (rook) diagonal
pivoting method. The partial factorization has the form:

A  =  ( I  U12 ) ( A11  0  ) (  I       0    )  if UPLO = 'U', or:
( 0  U22 ) (  0   D  ) ( U12\*\*T U22\*\*T )

A  =  ( L11  0 ) (  D   0  ) ( L11\*\*T L21\*\*T )  if UPLO = 'L',
( L21  I ) (  0  A22 ) (  0       I    )

where the order of D is at most NB. The actual order is returned in
the argument KB, and is either NB or NB-1, or N if N <= NB.

DLASYF_RK is an auxiliary routine called by DSYTRF_RK. It uses
blocked code (calling Level 3 BLAS) to update the submatrix
A11 (if UPLO = 'U') or A22 (if UPLO = 'L').

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored:
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NB : INTEGER [in]
> The maximum number of columns of the matrix A that should be
> factored.  NB should be at least 2 to allow for 2-by-2 pivot
> blocks.

KB : INTEGER [out]
> The number of columns of A that were actually factored.
> KB is either NB-1 or NB, or N if N <= NB.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.
> If UPLO = 'U': the leading N-by-N upper triangular part
> of A contains the upper triangular part of the matrix A,
> and the strictly lower triangular part of A is not
> referenced.
> 
> If UPLO = 'L': the leading N-by-N lower triangular part
> of A contains the lower triangular part of the matrix A,
> and the strictly upper triangular part of A is not
> referenced.
> 
> On exit, contains:
> a) ONLY diagonal elements of the symmetric block diagonal
> matrix D on the diagonal of A, i.e. D(k,k) = A(k,k);
> (superdiagonal (or subdiagonal) elements of D
> are stored on exit in array E), and
> b) If UPLO = 'U': factor U in the superdiagonal part of A.
> If UPLO = 'L': factor L in the subdiagonal part of A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

E : DOUBLE PRECISION array, dimension (N) [out]
> On exit, contains the superdiagonal (or subdiagonal)
> elements of the symmetric block diagonal matrix D
> with 1-by-1 or 2-by-2 diagonal blocks, where
> If UPLO = 'U': E(i) = D(i-1,i), i=2:N, E(1) is set to 0;
> If UPLO = 'L': E(i) = D(i+1,i), i=1:N-1, E(N) is set to 0.
> 
> NOTE: For 1-by-1 diagonal block D(k), where
> 1 <= k <= N, the element E(k) is set to 0 in both
> UPLO = 'U' or UPLO = 'L' cases.

IPIV : INTEGER array, dimension (N) [out]
> IPIV describes the permutation matrix P in the factorization
> of matrix A as follows. The absolute value of IPIV(k)
> represents the index of row and column that were
> interchanged with the k-th row and column. The value of UPLO
> describes the order in which the interchanges were applied.
> Also, the sign of IPIV represents the block structure of
> the symmetric block diagonal matrix D with 1-by-1 or 2-by-2
> diagonal blocks which correspond to 1 or 2 interchanges
> at each factorization step.
> 
> If UPLO = 'U',
> ( in factorization order, k decreases from N to 1 ):
> a) A single positive entry IPIV(k) > 0 means:
> D(k,k) is a 1-by-1 diagonal block.
> If IPIV(k) != k, rows and columns k and IPIV(k) were
> interchanged in the submatrix A(1:N,N-KB+1:N);
> If IPIV(k) = k, no interchange occurred.
> 
> 
> b) A pair of consecutive negative entries
> IPIV(k) < 0 and IPIV(k-1) < 0 means:
> D(k-1:k,k-1:k) is a 2-by-2 diagonal block.
> (NOTE: negative entries in IPIV appear ONLY in pairs).
> 1) If -IPIV(k) != k, rows and columns
> k and -IPIV(k) were interchanged
> in the matrix A(1:N,N-KB+1:N).
> If -IPIV(k) = k, no interchange occurred.
> 2) If -IPIV(k-1) != k-1, rows and columns
> k-1 and -IPIV(k-1) were interchanged
> in the submatrix A(1:N,N-KB+1:N).
> If -IPIV(k-1) = k-1, no interchange occurred.
> 
> c) In both cases a) and b) is always ABS( IPIV(k) ) <= k.
> 
> d) NOTE: Any entry IPIV(k) is always NONZERO on output.
> 
> If UPLO = 'L',
> ( in factorization order, k increases from 1 to N ):
> a) A single positive entry IPIV(k) > 0 means:
> D(k,k) is a 1-by-1 diagonal block.
> If IPIV(k) != k, rows and columns k and IPIV(k) were
> interchanged in the submatrix A(1:N,1:KB).
> If IPIV(k) = k, no interchange occurred.
> 
> b) A pair of consecutive negative entries
> IPIV(k) < 0 and IPIV(k+1) < 0 means:
> D(k:k+1,k:k+1) is a 2-by-2 diagonal block.
> (NOTE: negative entries in IPIV appear ONLY in pairs).
> 1) If -IPIV(k) != k, rows and columns
> k and -IPIV(k) were interchanged
> in the submatrix A(1:N,1:KB).
> If -IPIV(k) = k, no interchange occurred.
> 2) If -IPIV(k+1) != k+1, rows and columns
> k-1 and -IPIV(k-1) were interchanged
> in the submatrix A(1:N,1:KB).
> If -IPIV(k+1) = k+1, no interchange occurred.
> 
> c) In both cases a) and b) is always ABS( IPIV(k) ) >= k.
> 
> d) NOTE: Any entry IPIV(k) is always NONZERO on output.

W : DOUBLE PRECISION array, dimension (LDW,NB) [out]

LDW : INTEGER [in]
> The leading dimension of the array W.  LDW >= max(1,N).

INFO : INTEGER [out]
> = 0: successful exit
> 
> < 0: If INFO = -k, the k-th argument had an illegal value
> 
> > 0: If INFO = k, the matrix A is singular, because:
> If UPLO = 'U': column k in the upper
> triangular part of A contains all zeros.
> If UPLO = 'L': column k in the lower
> triangular part of A contains all zeros.
> 
> Therefore D(k,k) is exactly zero, and superdiagonal
> elements of column k of U (or subdiagonal elements of
> column k of L ) are all zeros. The factorization has
> been completed, but the block diagonal matrix D is
> exactly singular, and division by zero will occur if
> it is used to solve a system of equations.
> 
> NOTE: INFO only stores the first occurrence of
> a singularity, any subsequent occurrence of singularity
> is not stored in INFO even though the factorization
> always completes.
